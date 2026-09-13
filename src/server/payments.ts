import { badRequest, notFound } from "@/lib/api-error";
import { Decimal, money, paymentStatus } from "@/lib/money";
import { prisma, type DbTransaction } from "@/lib/prisma";
import { paymentCreateSchema } from "@/lib/validation";
import { appendLedgerEntry } from "@/server/ledger";

const paymentInclude = {
  company: true,
  purchase: true,
  sale: true,
} as const;

export async function listPayments(filters: { companyId?: string; take?: number }) {
  return prisma.payment.findMany({
    where: filters.companyId ? { companyId: filters.companyId } : undefined,
    include: paymentInclude,
    orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
    take: filters.take ?? 100,
  });
}

export async function getPayment(id: string) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: paymentInclude,
  });
  if (!payment) throw notFound("Payment not found");
  return payment;
}

export async function createPayment(input: unknown) {
  const data = paymentCreateSchema.parse(input);
  if (data.purchaseId && data.saleId) {
    throw badRequest("A payment cannot be allocated to both a purchase and a sale");
  }
  if (data.direction === "IN" && data.purchaseId) {
    throw badRequest("Incoming payments cannot be allocated to a purchase");
  }
  if (data.direction === "OUT" && data.saleId) {
    throw badRequest("Outgoing payments cannot be allocated to a sale");
  }

  const amount = money(data.amount, "amount");
  if (amount.lte(0)) throw badRequest("Payment amount must be greater than zero");

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.findUnique({ where: { id: data.companyId } });
    if (!company) throw notFound("Company not found");

    if (data.direction === "IN") {
      if (company.type === "SUPPLIER") {
        throw badRequest("This company is a supplier only and cannot make incoming payments");
      }
      if (new Decimal(company.receivableBalance).lt(amount)) {
        throw badRequest("Payment exceeds receivable outstanding for this company");
      }
    } else {
      if (company.type === "BUYER") {
        throw badRequest("This company is a buyer only and cannot receive outgoing payments");
      }
      if (new Decimal(company.payableBalance).lt(amount)) {
        throw badRequest("Payment exceeds payable outstanding for this company");
      }
    }

    const payment = await tx.payment.create({
      data: {
        companyId: company.id,
        direction: data.direction,
        paymentDate: data.paymentDate,
        amount,
        method: data.method?.trim() || null,
        notes: data.notes?.trim() || null,
        purchaseId: data.purchaseId,
        saleId: data.saleId,
      },
    });

    if (data.direction === "IN") {
      await allocateToSales(tx, {
        companyId: company.id,
        amount,
        saleId: data.saleId,
      });
      await appendLedgerEntry(tx, {
        companyId: company.id,
        type: "PAYMENT_IN",
        category: "RECEIVABLE",
        entryDate: data.paymentDate,
        description: `Payment received from ${company.name}`,
        debit: new Decimal(0),
        credit: amount,
        saleId: data.saleId,
        paymentId: payment.id,
      });
    } else {
      await allocateToPurchases(tx, {
        companyId: company.id,
        amount,
        purchaseId: data.purchaseId,
      });
      await appendLedgerEntry(tx, {
        companyId: company.id,
        type: "PAYMENT_OUT",
        category: "PAYABLE",
        entryDate: data.paymentDate,
        description: `Payment made to ${company.name}`,
        debit: new Decimal(0),
        credit: amount,
        purchaseId: data.purchaseId,
        paymentId: payment.id,
      });
    }

    return tx.payment.findUniqueOrThrow({
      where: { id: payment.id },
      include: paymentInclude,
    });
  }, { maxWait: 15000, timeout: 45000 });
}

async function allocateToSales(
  tx: DbTransaction,
  input: { companyId: string; amount: InstanceType<typeof Decimal>; saleId?: string },
) {
  const sales = input.saleId
    ? [await tx.sale.findUnique({ where: { id: input.saleId } })]
    : await tx.sale.findMany({
        where: { buyerId: input.companyId, status: { not: "PAID" } },
        orderBy: [{ saleDate: "asc" }, { createdAt: "asc" }],
      });

  if (input.saleId) {
    const sale = sales[0];
    if (!sale) throw notFound("Sale not found");
    if (sale.buyerId !== input.companyId) throw badRequest("Sale does not belong to this company");
    if (new Decimal(sale.outstandingAmount).lt(input.amount)) {
      throw badRequest("Payment exceeds outstanding amount on this sale");
    }
  }

  let remaining = input.amount;
  for (const sale of sales) {
    if (!sale || remaining.lte(0)) break;
    const apply = Decimal.min(remaining, new Decimal(sale.outstandingAmount));
    if (apply.lte(0)) continue;
    const amountReceived = new Decimal(sale.amountReceived).add(apply);
    const outstandingAmount = new Decimal(sale.outstandingAmount).sub(apply);
    await tx.sale.update({
      where: { id: sale.id },
      data: {
        amountReceived,
        outstandingAmount,
        status: paymentStatus(new Decimal(sale.totalAmount), outstandingAmount),
      },
    });
    remaining = remaining.sub(apply);
  }

  if (remaining.gt(0)) {
    throw badRequest("Payment exceeds receivable outstanding for this company");
  }
}

async function allocateToPurchases(
  tx: DbTransaction,
  input: { companyId: string; amount: InstanceType<typeof Decimal>; purchaseId?: string },
) {
  const purchases = input.purchaseId
    ? [await tx.purchase.findUnique({ where: { id: input.purchaseId } })]
    : await tx.purchase.findMany({
        where: { supplierId: input.companyId, status: { not: "PAID" } },
        orderBy: [{ purchaseDate: "asc" }, { createdAt: "asc" }],
      });

  if (input.purchaseId) {
    const purchase = purchases[0];
    if (!purchase) throw notFound("Purchase not found");
    if (purchase.supplierId !== input.companyId) throw badRequest("Purchase does not belong to this company");
    if (new Decimal(purchase.outstandingAmount).lt(input.amount)) {
      throw badRequest("Payment exceeds outstanding amount on this purchase");
    }
  }

  let remaining = input.amount;
  for (const purchase of purchases) {
    if (!purchase || remaining.lte(0)) break;
    const apply = Decimal.min(remaining, new Decimal(purchase.outstandingAmount));
    if (apply.lte(0)) continue;
    const amountPaid = new Decimal(purchase.amountPaid).add(apply);
    const outstandingAmount = new Decimal(purchase.outstandingAmount).sub(apply);
    await tx.purchase.update({
      where: { id: purchase.id },
      data: {
        amountPaid,
        outstandingAmount,
        status: paymentStatus(new Decimal(purchase.totalAmount), outstandingAmount),
      },
    });
    remaining = remaining.sub(apply);
  }

  if (remaining.gt(0)) {
    throw badRequest("Payment exceeds payable outstanding for this company");
  }
}
