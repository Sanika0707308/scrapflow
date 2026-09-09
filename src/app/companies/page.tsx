"use client";

import { useEffect, useState } from "react";
import { DataPanel, FeaturePage, FormPanel, SummaryCards } from "@/components/FeaturePage";

type Company = { [key: string]: string | number | undefined };

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  useEffect(() => { try { setCompanies(JSON.parse(localStorage.getItem("scrapflow-add-a-company") || "[]") as Company[]); } catch { setCompanies([]); } }, []);
  const companyRows = companies.map((company) => ({ title: String(company["Company name"] || "Unnamed company"), subtitle: `${String(company["Company type"] || "Company")} · Contact: ${String(company["Contact person"] || "Not provided")}`, amount: "No outstanding", status: String(company["Company type"] || "Company"), tone: "blue" as const }));
  const addCompany = (values: Record<string, string>) => setCompanies((current) => [{ ...values, id: Date.now() }, ...current]);
  const suppliers = companies.filter((company) => company["Company type"] === "Supplier" || company["Company type"] === "Both").length;
  const buyers = companies.filter((company) => company["Company type"] === "Buyer" || company["Company type"] === "Both").length;
  return <FeaturePage active="/companies" eyebrow="COMPANY DIRECTORY" title="Companies" description="Keep supplier and buyer details together in one place." actionLabel="Add company" actionHref="#form">
    <SummaryCards cards={[{ label: "All companies", value: String(companies.length), note: companies.length ? "Saved companies" : "Add your first company", tone: "green" }, { label: "Suppliers", value: String(suppliers), note: "Companies we buy from", tone: "amber" }, { label: "Buyers", value: String(buyers), note: "Companies we sell to", tone: "blue" }, { label: "With outstanding", value: "0", note: "Updates after transactions", tone: "red" }]} />
    <DataPanel title="Company list" subtitle="Your saved companies will appear here" allowDelete rows={companyRows} emptyText="No companies added yet. Use Add company to create your first supplier or buyer." />
    <FormPanel title="Add a company" storageKey="add-a-company" onSave={addCompany} requiredFields={["Company name", "Company type"]} fields={["Company name", "Company type", "Contact person", "Mobile number", "Email", "GST number", "Address"]} />
  </FeaturePage>;
}
