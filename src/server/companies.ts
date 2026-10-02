import { Decimal } from "@/lib/money";
import { badRequest, conflict, notFound } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { companyCreateSchema, companyUpdateSchema } from "@/lib/validation";
import { validateEmail, validateGstin, validatePhoneNumber } from "@/lib/company-validation";

function emptyToNull(value?: string | null) {
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
  const parsed = companyCreateSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    throw badRequest(firstIssue?.message || "Validation failed", parsed.error.issues);
  }
  const data = parsed.data;

  const normalizedGst = data.gstNumber ? validateGstin(data.gstNumber).normalized ?? null : null;
  const normalizedEmail = data.email ? validateEmail(data.email).normalized ?? null : null;
  const normalizedMobile = validatePhoneNumber(data.mobile).normalized ?? data.mobile.trim();

  if (normalizedGst) {
    const existing = await prisma.company.findFirst({
      where: {
        gstNumber: { equals: normalizedGst, mode: "insensitive" },
      },
    });
    if (existing) {
      throw conflict(`A company with GSTIN ${normalizedGst} already exists (${existing.name}).`);
    }
  }

  return prisma.company.create({
    data: {
      name: data.name,
      type: data.type,
      contactPerson: emptyToNull(data.contactPerson),
      mobile: normalizedMobile,
      email: normalizedEmail,
      gstNumber: normalizedGst,
      address: emptyToNull(data.address),
    },
  });
}

export async function updateCompany(id: string, input: unknown) {
  await getCompany(id);
  const parsed = companyUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    throw badRequest(firstIssue?.message || "Validation failed", parsed.error.issues);
  }
  const data = parsed.data;

  const normalizedGst =
    data.gstNumber !== undefined
      ? data.gstNumber
        ? validateGstin(data.gstNumber).normalized ?? null
        : null
      : undefined;

  const normalizedEmail =
    data.email !== undefined
      ? data.email
        ? validateEmail(data.email).normalized ?? null
        : null
      : undefined;

  const normalizedMobile =
    data.mobile !== undefined
      ? data.mobile
        ? validatePhoneNumber(data.mobile).normalized ?? data.mobile.trim()
        : null
      : undefined;

  if (normalizedGst) {
    const existing = await prisma.company.findFirst({
      where: {
        gstNumber: { equals: normalizedGst, mode: "insensitive" },
        id: { not: id },
      },
    });
    if (existing) {
      throw conflict(`A company with GSTIN ${normalizedGst} already exists (${existing.name}).`);
    }
  }

  return prisma.company.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.contactPerson !== undefined ? { contactPerson: emptyToNull(data.contactPerson) } : {}),
      ...(normalizedMobile !== undefined ? { mobile: normalizedMobile } : {}),
      ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
      ...(normalizedGst !== undefined ? { gstNumber: normalizedGst } : {}),
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
    throw conflict("This company cannot be deleted because it has existing transactions.");
  }

  if (!new Decimal(company.receivableBalance).isZero() || !new Decimal(company.payableBalance).isZero()) {
    throw conflict("This company cannot be deleted because it has existing transactions.");
  }

  try {
    return await prisma.company.delete({ where: { id } });
  } catch (error: unknown) {
    // If foreign key constraint failed, ensure clean conflict message instead of 500
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2003"
    ) {
      throw conflict("This company cannot be deleted because it has existing transactions.");
    }
    throw error;
  }
}
