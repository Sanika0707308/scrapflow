import { conflict, notFound } from "@/lib/api-error";
import { Decimal, nonNegativeQuantity } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { isTonneUnit } from "@/lib/quantity";
import { scrapTypeCreateSchema, scrapTypeUpdateSchema } from "@/lib/validation";
import { applyStockMovement } from "@/server/stock";

export async function listScrapTypes() {
  return prisma.scrapType.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getScrapType(id: string) {
  const scrapType = await prisma.scrapType.findUnique({ where: { id } });
  if (!scrapType) throw notFound("Scrap type not found");
  return scrapType;
}

export async function createScrapType(input: unknown) {
  const data = scrapTypeCreateSchema.parse(input);
  const rawOpening =
    data.openingStock === undefined ? new Decimal(0) : nonNegativeQuantity(data.openingStock, "openingStock");
  const opening = isTonneUnit(data.unit) ? rawOpening.mul(1000) : rawOpening;

  return prisma.$transaction(async (tx) => {
    const scrapType = await tx.scrapType.create({
      data: {
        name: data.name,
        category: data.category?.trim() || null,
        unit: data.unit,
        currentStock: new Decimal(0),
        notes: data.notes?.trim() || null,
      },
    });

    if (opening.gt(0)) {
      await applyStockMovement(tx, {
        scrapTypeId: scrapType.id,
        type: "OPENING",
        quantity: opening,
        occurredAt: scrapType.createdAt,
      });
    }

    return tx.scrapType.findUniqueOrThrow({ where: { id: scrapType.id } });
  }, { maxWait: 15000, timeout: 45000 });
}

export async function updateScrapType(id: string, input: unknown) {
  await getScrapType(id);
  const data = scrapTypeUpdateSchema.parse(input);
  return prisma.scrapType.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.category !== undefined ? { category: data.category.trim() || null } : {}),
      ...(data.unit !== undefined ? { unit: data.unit } : {}),
      ...(data.notes !== undefined ? { notes: data.notes.trim() || null } : {}),
    },
  });
}

export async function listStock() {
  return prisma.scrapType.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      unit: true,
      currentStock: true,
      notes: true,
      updatedAt: true,
    },
  });
}

export async function listStockMovements(filters: { scrapTypeId?: string; take?: number }) {
  return prisma.stockMovement.findMany({
    where: filters.scrapTypeId ? { scrapTypeId: filters.scrapTypeId } : undefined,
    include: { scrapType: true, purchase: true, sale: true },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: filters.take ?? 100,
  });
}

export async function deleteScrapType(id: string) {
  const scrapType = await prisma.scrapType.findUnique({
    where: { id },
    include: {
      _count: { select: { purchaseItems: true, saleItems: true } },
    },
  });
  if (!scrapType) throw notFound("Scrap type not found");
  if (scrapType._count.purchaseItems > 0 || scrapType._count.saleItems > 0) {
    throw conflict("Scrap type cannot be deleted because it is used in purchases or sales");
  }
  if (!new Decimal(scrapType.currentStock).isZero()) {
    throw conflict("Scrap type cannot be deleted while stock remains");
  }

  return prisma.$transaction(async (tx) => {
    await tx.stockMovement.deleteMany({ where: { scrapTypeId: id } });
    return tx.scrapType.delete({ where: { id } });
  }, { maxWait: 15000, timeout: 45000 });
}
