import type { StockMovementType } from "@/generated/prisma/client";
import { badRequest, notFound } from "@/lib/api-error";
import { Decimal } from "@/lib/money";
import type { DbTransaction } from "@/lib/prisma";

export async function applyStockMovement(
  tx: DbTransaction,
  input: {
    scrapTypeId: string;
    type: StockMovementType;
    quantity: PrismaDecimal;
    occurredAt: Date;
    purchaseId?: string;
    saleId?: string;
  },
) {
  const scrapType = await tx.scrapType.findUnique({ where: { id: input.scrapTypeId } });
  if (!scrapType) {
    throw notFound("Scrap type not found");
  }

  await tx.stockMovement.create({
    data: {
      scrapTypeId: input.scrapTypeId,
      type: input.type,
      quantity: input.quantity,
      balanceAfter: new Decimal(0),
      occurredAt: input.occurredAt,
      purchaseId: input.purchaseId,
      saleId: input.saleId,
    },
  });

  return recomputeStock(tx, input.scrapTypeId);
}

export async function recomputeStock(tx: DbTransaction, scrapTypeId: string) {
  const movements = await tx.stockMovement.findMany({
    where: { scrapTypeId },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
  });

  let stock = new Decimal(0);
  for (const movement of movements) {
    stock = stock.add(movement.quantity);
    if (stock.lt(0)) {
      throw badRequest("Sale quantity exceeds available stock for a scrap type");
    }
    if (!stock.eq(movement.balanceAfter)) {
      await tx.stockMovement.update({
        where: { id: movement.id },
        data: { balanceAfter: stock },
      });
    }
  }

  await tx.scrapType.update({
    where: { id: scrapTypeId },
    data: { currentStock: stock },
  });

  return stock;
}

type PrismaDecimal = InstanceType<typeof Decimal>;
