import { notFound } from "@/lib/api-error";
import { Decimal } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export async function getUdhari() {
  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
  });

  const receivable = companies
    .filter((company) => new Decimal(company.receivableBalance).gt(0))
    .map((company) => ({
      companyId: company.id,
      name: company.name,
      type: company.type,
      receivableBalance: company.receivableBalance,
    }));

  const payable = companies
    .filter((company) => new Decimal(company.payableBalance).gt(0))
    .map((company) => ({
      companyId: company.id,
      name: company.name,
      type: company.type,
      payableBalance: company.payableBalance,
    }));

  const totals = companies.reduce(
    (acc, company) => ({
      receivable: acc.receivable.add(company.receivableBalance),
      payable: acc.payable.add(company.payableBalance),
    }),
    { receivable: new Decimal(0), payable: new Decimal(0) },
  );

  return {
    totals: {
      receivable: totals.receivable,
      payable: totals.payable,
      companiesPending: receivable.length + payable.length,
    },
    receivable,
    payable,
  };
}

export async function getCompanyLedger(companyId: string, category?: "RECEIVABLE" | "PAYABLE") {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw notFound("Company not found");

  const loadCategory = async (selected: "RECEIVABLE" | "PAYABLE") => {
    const entries = await prisma.ledgerEntry.findMany({
      where: { companyId, category: selected },
      orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
    });
    const runningBalance =
      selected === "RECEIVABLE" ? company.receivableBalance : company.payableBalance;
    return { category: selected, runningBalance, entries };
  };

  if (category) {
    return {
      company: {
        id: company.id,
        name: company.name,
        type: company.type,
        receivableBalance: company.receivableBalance,
        payableBalance: company.payableBalance,
      },
      ledger: await loadCategory(category),
    };
  }

  return {
    company: {
      id: company.id,
      name: company.name,
      type: company.type,
      receivableBalance: company.receivableBalance,
      payableBalance: company.payableBalance,
    },
    receivable: await loadCategory("RECEIVABLE"),
    payable: await loadCategory("PAYABLE"),
  };
}

export async function getDashboard() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [stock, companies, monthPurchases, monthSales] = await Promise.all([
    prisma.scrapType.findMany({ orderBy: { name: "asc" } }),
    prisma.company.findMany(),
    prisma.purchase.findMany({ where: { purchaseDate: { gte: monthStart } } }),
    prisma.sale.findMany({ where: { saleDate: { gte: monthStart } } }),
  ]);

  const purchaseAmount = monthPurchases.reduce((sum, row) => sum.add(row.totalAmount), new Decimal(0));
  const salesAmount = monthSales.reduce((sum, row) => sum.add(row.totalAmount), new Decimal(0));
  const receivable = companies.reduce((sum, row) => sum.add(row.receivableBalance), new Decimal(0));
  const payable = companies.reduce((sum, row) => sum.add(row.payableBalance), new Decimal(0));

  return {
    stock: stock.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      currentStock: item.currentStock,
    })),
    month: {
      purchaseAmount,
      salesAmount,
      purchaseCount: monthPurchases.length,
      salesCount: monthSales.length,
    },
    outstanding: {
      receivable,
      payable,
    },
    companyCount: companies.length,
  };
}
