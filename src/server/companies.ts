import { Decimal } from "@/lib/money";
import { conflict, notFound } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { companyCreateSchema, companyUpdateSchema } from "@/lib/validation";

function emptyToNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function listCompanies() {
  return prisma.company.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getCompany(id: string) {
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw notFound("Company not found");
  return company;
}

export async function createCompany(input: unknown) {
  const data = companyCreateSchema.parse(input);
  return prisma.company.create({
    data: {
      name: data.name,
      type: data.type,
      contactPerson: emptyToNull(data.contactPerson),
      mobile: emptyToNull(data.mobile),
      email: emptyToNull(data.email),
      gstNumber: emptyToNull(data.gstNumber),
      address: emptyToNull(data.address),
    },
  });
}

export async function updateCompany(id: string, input: unknown) {
  await getCompany(id);
  const data = companyUpdateSchema.parse(input);
  return prisma.company.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.contactPerson !== undefined ? { contactPerson: emptyToNull(data.contactPerson) } : {}),
      ...(data.mobile !== undefined ? { mobile: emptyToNull(data.mobile) } : {}),
      ...(data.email !== undefined ? { email: emptyToNull(data.email) } : {}),
      ...(data.gstNumber !== undefined ? { gstNumber: emptyToNull(data.gstNumber) } : {}),
      ...(data.address !== undefined ? { address: emptyToNull(data.address) } : {}),
    },
  });
}

export async function deleteCompany(id: string) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      _count: { select: { purchases: true, sales: true, payments: true, ledgerEntries: true } },
    },
  });
  if (!company) throw notFound("Company not found");

  const related =
    company._count.purchases + company._count.sales + company._count.payments + company._count.ledgerEntries;
  if (related > 0) {
    throw conflict("Company cannot be deleted because it has transactions");
  }

  if (!new Decimal(company.receivableBalance).isZero() || !new Decimal(company.payableBalance).isZero()) {
    throw conflict("Company cannot be deleted while outstanding balances exist");
  }

  return prisma.company.delete({ where: { id } });
}
