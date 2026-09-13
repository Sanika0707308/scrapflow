"use client";

import { useCallback, useEffect, useState } from "react";
import { DataPanel, FeaturePage, FormPanel, SummaryCards, type FeatureRow } from "@/components/FeaturePage";

type ApiCompany = {
  id: string;
  name: string;
  type: "SUPPLIER" | "BUYER" | "BOTH";
  contactPerson: string | null;
  mobile: string | null;
  email: string | null;
  gstNumber: string | null;
  address: string | null;
  receivableBalance: string | number;
  payableBalance: string | number;
  createdAt: string;
  updatedAt: string;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/companies");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to fetch companies (status ${res.status})`);
      }
      const data: ApiCompany[] = await res.json();
      setCompanies(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load companies";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch("/api/companies")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Failed to fetch companies (status ${res.status})`);
        }
        return res.json();
      })
      .then((data: ApiCompany[]) => {
        if (!ignore) {
          setCompanies(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Failed to load companies";
          setError(msg);
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const addCompany = async (values: Record<string, string>) => {
    const typeMap: Record<string, "SUPPLIER" | "BUYER" | "BOTH"> = {
      Supplier: "SUPPLIER",
      Buyer: "BUYER",
      Both: "BOTH",
    };
    const apiType = typeMap[values["Company type"]] || "BOTH";

    const payload = {
      name: values["Company name"].trim(),
      type: apiType,
      contactPerson: values["Contact person"]?.trim() || undefined,
      mobile: values["Mobile number"]?.trim() || undefined,
      email: values["Email"]?.trim() || undefined,
      gstNumber: values["GST number"]?.trim() || undefined,
      address: values["Address"]?.trim() || undefined,
    };

    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Failed to create company.");
    }

    await loadCompanies();
  };

  const deleteCompany = async (row: FeatureRow) => {
    if (!row.id) return;
    try {
      const res = await fetch(`/api/companies/${row.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || "Failed to delete company.");
        return;
      }

      await loadCompanies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error deleting company";
      alert(msg);
    }
  };

  const companyRows: FeatureRow[] = companies.map((company) => {
    const rec = Number(company.receivableBalance) || 0;
    const pay = Number(company.payableBalance) || 0;
    let amount = "No outstanding";
    if (rec > 0) amount = `To receive: ${formatCurrency(rec)}`;
    else if (pay > 0) amount = `To pay: ${formatCurrency(pay)}`;

    const typeLabel = company.type === "SUPPLIER" ? "Supplier" : company.type === "BUYER" ? "Buyer" : "Both";
    const tone = company.type === "SUPPLIER" ? ("amber" as const) : company.type === "BUYER" ? ("blue" as const) : ("green" as const);
    const contactText = company.contactPerson ? `Contact: ${company.contactPerson}` : "No contact";
    const mobileText = company.mobile ? ` · ${company.mobile}` : "";

    return {
      id: company.id,
      title: company.name,
      subtitle: `${typeLabel} · ${contactText}${mobileText}`,
      amount,
      status: typeLabel,
      tone,
    };
  });

  const suppliers = companies.filter((c) => c.type === "SUPPLIER" || c.type === "BOTH").length;
  const buyers = companies.filter((c) => c.type === "BUYER" || c.type === "BOTH").length;
  const withOutstanding = companies.filter(
    (c) => (Number(c.receivableBalance) || 0) > 0 || (Number(c.payableBalance) || 0) > 0
  ).length;

  return (
    <FeaturePage active="/companies" eyebrow="COMPANY DIRECTORY" title="Companies" description="Keep supplier and buyer details together in one place." actionLabel="Add company" actionHref="#form">
      <SummaryCards cards={[
        { label: "All companies", value: String(companies.length), note: companies.length ? "Saved companies" : "Add your first company", tone: "green" },
        { label: "Suppliers", value: String(suppliers), note: "Companies we buy from", tone: "amber" },
        { label: "Buyers", value: String(buyers), note: "Companies we sell to", tone: "blue" },
        { label: "With outstanding", value: String(withOutstanding), note: withOutstanding ? "Companies with balance" : "No pending balance", tone: "red" }
      ]} />
      <DataPanel
        title="Company list"
        subtitle="Your saved companies will appear here"
        allowDelete
        rows={companyRows}
        onDelete={deleteCompany}
        loading={loading}
        error={error}
        emptyText={loading ? "Loading companies..." : "No companies added yet. Use Add company to create your first supplier or buyer."}
      />
      <FormPanel
        title="Add a company"
        disableLocalStorage
        onSave={addCompany}
        requiredFields={["Company name", "Company type"]}
        fields={["Company name", "Company type", "Contact person", "Mobile number", "Email", "GST number", "Address"]}
      />
    </FeaturePage>
  );
}

