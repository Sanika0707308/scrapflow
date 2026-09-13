import type { LedgerBalanceCategory, LedgerEntryType, Prisma } from "@/generated/prisma/client";
import { badRequest } from "@/lib/api-error";
import { Decimal } from "@/lib/money";
import type { DbTransaction } from "@/lib/prisma";

export async function appendLedgerEntry(
  tx: DbTransaction,
  input: {
    companyId: string;
    type: LedgerEntryType;
    category: LedgerBalanceCategory;
    entryDate: Date;
    description: string;
    debit: Prisma.Decimal;
    credit: Prisma.Decimal;
    purchaseId?: string;
    saleId?: string;
    paymentId?: string;
  },
) {
  if (input.category === "RECEIVABLE" && input.type !== "SALE" && input.type !== "PAYMENT_IN") {
    throw badRequest("Receivable ledger entries must be SALE or PAYMENT_IN");
  }
  if (input.category === "PAYABLE" && input.type !== "PURCHASE" && input.type !== "PAYMENT_OUT") {
    throw badRequest("Payable ledger entries must be PURCHASE or PAYMENT_OUT");
  }

  await tx.ledgerEntry.create({
    data: {
      companyId: input.companyId,
      type: input.type,
      category: input.category,
      entryDate: input.entryDate,
      description: input.description,
      debit: input.debit,
      credit: input.credit,
      runningBalance: new Decimal(0),
      purchaseId: input.purchaseId,
      saleId: input.saleId,
      paymentId: input.paymentId,
    },
  });

  return recomputeCategoryBalance(tx, input.companyId, input.category);
}

export async function recomputeCategoryBalance(
  tx: DbTransaction,
  companyId: string,
  category: LedgerBalanceCategory,
) {
  const entries = await tx.ledgerEntry.findMany({
    where: { companyId, category },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
  });

  let running = new Decimal(0);
  for (const entry of entries) {
    running = running.add(entry.debit).sub(entry.credit);
    if (!running.eq(entry.runningBalance)) {
      await tx.ledgerEntry.update({
        where: { id: entry.id },
        data: { runningBalance: running },
      });
    }
  }

  if (running.lt(0)) {
    throw badRequest(
      category === "RECEIVABLE"
        ? "Payment exceeds receivable outstanding for this company"
        : "Payment exceeds payable outstanding for this company",
    );
  }

  await tx.company.update({
    where: { id: companyId },
    data: category === "RECEIVABLE" ? { receivableBalance: running } : { payableBalance: running },
  });

  return running;
}
