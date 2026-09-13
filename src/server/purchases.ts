import { badRequest, notFound } from "@/lib/api-error";
import { Decimal, lineAmount, money, paymentStatus, quantity } from "@/lib/money";
import { prisma, type DbTransaction } from "@/lib/prisma";
import { isTonneUnit } from "@/lib/quantity";
import { purchaseCreateSchema } from "@/lib/validation";
import { appendLedgerEntry } from "@/server/ledger";
import { applyStockMovement } from "@/server/stock";

const purchaseInclude = {
  supplier: true,
  items: { include: { scrapType: true } },
  payments: true,
} as const;

export async function listPurchases(filters: { companyId?: string; take?: number }) {
  return prisma.purchase.findMany({
    where: filters.companyId ? { supplierId: filters.companyId } : undefined,
    include: purchaseInclude,
    orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
    take: filters.take ?? 100,
  });
}

export async function getPurchase(id: string) {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: purchaseInclude,
  });
  if (!purchase) throw notFound("Purchase not found");
  return purchase;
}

export async function createPurchase(input: unknown) {
  const data = purchaseCreateSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const supplier = await tx.company.findUnique({ where: { id: data.supplierId } });
    if (!supplier) throw badRequest("Supplier company not found");
    if (supplier.type === "BUYER") {
      throw badRequest("This company is a buyer only and cannot be used on a purchase");
    }

    const items = await buildItems(tx, data.items);
    const totalAmount = items.reduce((sum, item) => sum.add(item.amount), new Decimal(0));
    if (totalAmount.lte(0)) throw badRequest("Purchase total must be greater than zero");

    const amountPaid = data.amountPaid === undefined ? new Decimal(0) : money(data.amountPaid, "amountPaid");
    if (amountPaid.gt(totalAmount)) throw badRequest("Amount paid cannot exceed purchase total");
    const outstandingAmount = totalAmount.sub(amountPaid);

    const purchase = await tx.purchase.create({
      data: {
        supplierId: supplier.id,
        purchaseDate: data.purchaseDate,
        notes: data.notes?.trim() || null,
        totalAmount,
        amountPaid,
        outstandingAmount,
        status: paymentStatus(totalAmount, outstandingAmount),
        items: {
          create: items.map((item) => ({
            scrapTypeId: item.scrapTypeId,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
          })),
        },
      },
    });

    for (const item of items) {
      await applyStockMovement(tx, {
        scrapTypeId: item.scrapTypeId,
        type: "PURCHASE",
        quantity: item.quantity,
        occurredAt: purchase.purchaseDate,
        purchaseId: purchase.id,
      });
    }

    await appendLedgerEntry(tx, {
      companyId: supplier.id,
      type: "PURCHASE",
      category: "PAYABLE",
      entryDate: purchase.purchaseDate,
      description: `Purchase from ${supplier.name}`,
      debit: totalAmount,
      credit: new Decimal(0),
      purchaseId: purchase.id,
    });

    if (amountPaid.gt(0)) {
      const payment = await tx.payment.create({
        data: {
          companyId: supplier.id,
          direction: "OUT",
          paymentDate: purchase.purchaseDate,
          amount: amountPaid,
          notes: "Paid with purchase",
          purchaseId: purchase.id,
        },
      });

      await appendLedgerEntry(tx, {
        companyId: supplier.id,
        type: "PAYMENT_OUT",
        category: "PAYABLE",
        entryDate: purchase.purchaseDate,
        description: `Payment against purchase from ${supplier.name}`,
        debit: new Decimal(0),
        credit: amountPaid,
        purchaseId: purchase.id,
        paymentId: payment.id,
      });
    }

    return tx.purchase.findUniqueOrThrow({
      where: { id: purchase.id },
      include: purchaseInclude,
    });
  }, { maxWait: 15000, timeout: 45000 });
}

async function buildItems(
  tx: DbTransaction,
  items: { scrapTypeId: string; quantity: string | number; rate: string | number; unit?: string }[],
) {
  const built = [];
  for (const item of items) {
    const scrapType = await tx.scrapType.findUnique({ where: { id: item.scrapTypeId } });
    if (!scrapType) throw badRequest("Scrap type not found");
    const rawQty = quantity(item.quantity, "quantity");
    const rawRate = money(item.rate, "rate");

    const isTonne = isTonneUnit(item.unit);
    const qtyInKg = isTonne ? rawQty.mul(1000) : rawQty;
    const lineTotal = lineAmount(rawQty, rawRate);
    const ratePerKg = lineTotal.div(qtyInKg).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    built.push({
      scrapTypeId: scrapType.id,
      quantity: qtyInKg,
      rate: ratePerKg,
      amount: lineTotal,
    });
  }
  return built;
}
