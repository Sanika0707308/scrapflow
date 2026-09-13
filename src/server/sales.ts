import { badRequest, notFound } from "@/lib/api-error";
import { Decimal, lineAmount, money, paymentStatus, quantity } from "@/lib/money";
import { prisma, type DbTransaction } from "@/lib/prisma";
import { isTonneUnit } from "@/lib/quantity";
import { saleCreateSchema } from "@/lib/validation";
import { appendLedgerEntry } from "@/server/ledger";
import { applyStockMovement } from "@/server/stock";

const saleInclude = {
  buyer: true,
  items: { include: { scrapType: true } },
  payments: true,
} as const;

export async function listSales(filters: { companyId?: string; take?: number }) {
  return prisma.sale.findMany({
    where: filters.companyId ? { buyerId: filters.companyId } : undefined,
    include: saleInclude,
    orderBy: [{ saleDate: "desc" }, { createdAt: "desc" }],
    take: filters.take ?? 100,
  });
}

export async function getSale(id: string) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: saleInclude,
  });
  if (!sale) throw notFound("Sale not found");
  return sale;
}

export async function createSale(input: unknown) {
  const data = saleCreateSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const buyer = await tx.company.findUnique({ where: { id: data.buyerId } });
    if (!buyer) throw notFound("Buyer company not found");
    if (buyer.type === "SUPPLIER") {
      throw badRequest("This company is a supplier only and cannot be used on a sale");
    }

    const items = await buildItems(tx, data.items);
    const totalAmount = items.reduce((sum, item) => sum.add(item.amount), new Decimal(0));
    if (totalAmount.lte(0)) throw badRequest("Sale total must be greater than zero");

    const amountReceived =
      data.amountReceived === undefined ? new Decimal(0) : money(data.amountReceived, "amountReceived");
    if (amountReceived.gt(totalAmount)) throw badRequest("Amount received cannot exceed sale total");
    const outstandingAmount = totalAmount.sub(amountReceived);

    const requiredByType = new Map<string, InstanceType<typeof Decimal>>();
    for (const item of items) {
      requiredByType.set(item.scrapTypeId, (requiredByType.get(item.scrapTypeId) ?? new Decimal(0)).add(item.quantity));
    }
    for (const [scrapTypeId, required] of requiredByType) {
      const scrapType = await tx.scrapType.findUnique({ where: { id: scrapTypeId } });
      if (!scrapType) throw notFound("Scrap type not found");
      if (new Decimal(scrapType.currentStock).lt(required)) {
        throw badRequest(`Sale quantity exceeds available stock for ${scrapType.name}`);
      }
    }

    const sale = await tx.sale.create({
      data: {
        buyerId: buyer.id,
        saleDate: data.saleDate,
        notes: data.notes?.trim() || null,
        totalAmount,
        amountReceived,
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
        type: "SALE",
        quantity: item.quantity.neg(),
        occurredAt: sale.saleDate,
        saleId: sale.id,
      });
    }

    await appendLedgerEntry(tx, {
      companyId: buyer.id,
      type: "SALE",
      category: "RECEIVABLE",
      entryDate: sale.saleDate,
      description: `Sale to ${buyer.name}`,
      debit: totalAmount,
      credit: new Decimal(0),
      saleId: sale.id,
    });

    if (amountReceived.gt(0)) {
      const payment = await tx.payment.create({
        data: {
          companyId: buyer.id,
          direction: "IN",
          paymentDate: sale.saleDate,
          amount: amountReceived,
          notes: "Received with sale",
          saleId: sale.id,
        },
      });

      await appendLedgerEntry(tx, {
        companyId: buyer.id,
        type: "PAYMENT_IN",
        category: "RECEIVABLE",
        entryDate: sale.saleDate,
        description: `Payment against sale to ${buyer.name}`,
        debit: new Decimal(0),
        credit: amountReceived,
        saleId: sale.id,
        paymentId: payment.id,
      });
    }

    return tx.sale.findUniqueOrThrow({
      where: { id: sale.id },
      include: saleInclude,
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
