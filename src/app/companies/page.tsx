"use client";

import { useCallback, useEffect, useState } from "react";
import { DataPanel, FeaturePage, SummaryCards, type FeatureRow } from "@/components/FeaturePage";
import styles from "@/components/FeaturePage.module.css";
import { validateEmail, validateGstin, validatePhoneNumber } from "@/lib/company-validation";

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

  const [deleteStatus, setDeleteStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "Both" as "Supplier" | "Buyer" | "Both",
    contactPerson: "",
    mobile: "",
    email: "",
    gstNumber: "",
    address: "",
  });
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    mobile?: string;
    email?: string;
    gstNumber?: string;
  }>({});
  const [touched, setTouched] = useState<{
    name?: boolean;
    mobile?: boolean;
    email?: boolean;
    gstNumber?: boolean;
  }>({});
  const [formMessage, setFormMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      name: "",
      type: "Both",
      contactPerson: "",
      mobile: "",
      email: "",
      gstNumber: "",
      address: "",
    });
    setFieldErrors({});
    setTouched({});
    setEditingId(null);
  };

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

  const startEdit = (company: ApiCompany) => {
    setEditingId(company.id);
    const typeMap: Record<string, "Supplier" | "Buyer" | "Both"> = {
      SUPPLIER: "Supplier",
      BUYER: "Buyer",
      BOTH: "Both",
    };
    setFormData({
      name: company.name,
      type: typeMap[company.type] || "Both",
      contactPerson: company.contactPerson || "",
      mobile: company.mobile || "",
      email: company.email || "",
      gstNumber: company.gstNumber || "",
      address: company.address || "",
    });
    setFieldErrors({});
    setTouched({});
    setFormMessage(null);
    setDeleteStatus(null);
    const formElement = document.getElementById("form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const cancelEdit = () => {
    resetForm();
    setFormMessage(null);
  };

  const handleMobileChange = (val: string) => {
    setFormData((prev) => ({ ...prev, mobile: val }));
    if (val.length > 0) {
      const res = validatePhoneNumber(val);
      setFieldErrors((prev) => ({ ...prev, mobile: res.valid ? undefined : res.error }));
    } else {
      setFieldErrors((prev) => ({
        ...prev,
        mobile: touched.mobile ? "Phone number is required. Enter a 10-digit Indian mobile number." : undefined,
      }));
    }
  };

  const handleEmailChange = (val: string) => {
    setFormData((prev) => ({ ...prev, email: val }));
    if (val.trim().length > 0) {
      const res = validateEmail(val);
      setFieldErrors((prev) => ({ ...prev, email: res.valid ? undefined : res.error }));
    } else {
      setFieldErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handleGstinChange = (val: string) => {
    const upper = val.toUpperCase();
    setFormData((prev) => ({ ...prev, gstNumber: upper }));
    if (upper.trim().length > 0) {
      const res = validateGstin(upper);
      setFieldErrors((prev) => ({ ...prev, gstNumber: res.valid ? undefined : res.error }));
    } else {
      setFieldErrors((prev) => ({ ...prev, gstNumber: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, mobile: true, email: true, gstNumber: true });

    let hasError = false;
    const newErrors: { name?: string; mobile?: string; email?: string; gstNumber?: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = "Company name is required.";
      hasError = true;
    }

    const mobileRes = validatePhoneNumber(formData.mobile);
    if (!mobileRes.valid) {
      newErrors.mobile = mobileRes.error;
      hasError = true;
    }

    const emailRes = validateEmail(formData.email);
    if (!emailRes.valid) {
      newErrors.email = emailRes.error;
      hasError = true;
    }

    const gstRes = validateGstin(formData.gstNumber);
    if (!gstRes.valid) {
      newErrors.gstNumber = gstRes.error;
      hasError = true;
    }

    setFieldErrors(newErrors);

    if (hasError) {
      setFormMessage({
        type: "error",
        text: "Please fix the highlighted errors before saving.",
      });
      return;
    }

    setIsSubmitting(true);
    setFormMessage(null);

    const typeMap: Record<string, "SUPPLIER" | "BUYER" | "BOTH"> = {
      Supplier: "SUPPLIER",
      Buyer: "BUYER",
      Both: "BOTH",
    };

    const payload = {
      name: formData.name.trim(),
      type: typeMap[formData.type] || "BOTH",
      contactPerson: formData.contactPerson.trim() || undefined,
      mobile: mobileRes.normalized,
      email: emailRes.normalized ?? undefined,
      gstNumber: gstRes.normalized ?? undefined,
      address: formData.address.trim() || undefined,
    };

    try {
      const url = editingId ? `/api/companies/${editingId}` : "/api/companies";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body.error || body.details?.[0]?.message || "Failed to save company.";
        throw new Error(msg);
      }

      setFormMessage({
        type: "success",
        text: editingId ? "Company updated successfully." : "Company added successfully.",
      });
      resetForm();
      await loadCompanies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save company.";
      setFormMessage({ type: "error", text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCompany = async (row: FeatureRow) => {
    if (!row.id) return;
    setDeleteStatus(null);
    try {
      const res = await fetch(`/api/companies/${row.id}`, {
        method: "DELETE",
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorText =
          body.error || "This company cannot be deleted because it has existing transactions.";
        setDeleteStatus({ type: "error", text: errorText });
        return;
      }

      setDeleteStatus({
        type: "success",
        text: "Company deleted successfully",
      });

      if (editingId === row.id) {
        cancelEdit();
      }

      await loadCompanies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error deleting company";
      setDeleteStatus({ type: "error", text: msg });
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
    const gstText = company.gstNumber ? ` · GSTIN: ${company.gstNumber}` : "";

    return {
      id: company.id,
      title: company.name,
      subtitle: `${typeLabel} · ${contactText}${mobileText}${gstText}`,
      amount,
      status: typeLabel,
      tone,
      actionLabel: "Edit",
      onAction: () => startEdit(company),
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

      {deleteStatus && (
        <div
          role="status"
          style={{
            padding: "12px 18px",
            marginBottom: "14px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 500,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: deleteStatus.type === "success" ? "#eef7f0" : "#fdf2f0",
            color: deleteStatus.type === "success" ? "#22634d" : "#b45e4d",
            border: `1px solid ${deleteStatus.type === "success" ? "#cce8d6" : "#f5cfc7"}`,
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
          }}
        >
          <span>{deleteStatus.text}</span>
          <button
            type="button"
            onClick={() => setDeleteStatus(null)}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: 700,
              padding: "0 4px",
              marginLeft: "12px",
            }}
            aria-label="Dismiss alert"
          >
            ×
          </button>
        </div>
      )}

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

      <section className={styles.panel} id="form">
        <div className={styles.panelHeader}>
          <div>
            <h2>{editingId ? `Edit company: ${formData.name || "Company"}` : "Add a company"}</h2>
            <p>
              {editingId
                ? "Update details below and click Update company."
                : "Enter details below to save to the database."}
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              className={styles.secondaryButton}
              style={{ marginTop: 0 }}
              onClick={cancelEdit}
            >
              Cancel edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.formGrid}>
            <label>
              <span>Company name <span style={{ color: "#b45e4d" }}>*</span></span>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, name: val }));
                  if (touched.name || val.trim().length > 0) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      name: !val.trim() ? "Company name is required." : undefined,
                    }));
                  }
                }}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, name: true }));
                  setFieldErrors((prev) => ({
                    ...prev,
                    name: !formData.name.trim() ? "Company name is required." : undefined,
                  }));
                }}
                placeholder="Enter company name"
                style={fieldErrors.name ? { borderColor: "#b45e4d" } : undefined}
              />
              {fieldErrors.name && (
                <span style={{ color: "#b45e4d", fontSize: "11px", marginTop: "2px" }}>
                  {fieldErrors.name}
                </span>
              )}
            </label>

            <label>
              <span>Company type <span style={{ color: "#b45e4d" }}>*</span></span>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, type: e.target.value as "Supplier" | "Buyer" | "Both" }))
                }
              >
                <option value="Both">Both (Supplier & Buyer)</option>
                <option value="Supplier">Supplier (We buy from)</option>
                <option value="Buyer">Buyer (We sell to)</option>
              </select>
            </label>

            <label>
              <span>Contact person</span>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))}
                placeholder="Enter contact person"
              />
            </label>

            <label>
              <span>Mobile number <span style={{ color: "#b45e4d" }}>*</span></span>
              <input
                type="tel"
                value={formData.mobile}
                onChange={(e) => handleMobileChange(e.target.value)}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, mobile: true }));
                  const res = validatePhoneNumber(formData.mobile);
                  setFieldErrors((prev) => ({ ...prev, mobile: res.valid ? undefined : res.error }));
                }}
                placeholder="10-digit mobile number (e.g. 9876543210)"
                maxLength={15}
                style={fieldErrors.mobile ? { borderColor: "#b45e4d" } : undefined}
              />
              {fieldErrors.mobile ? (
                <span style={{ color: "#b45e4d", fontSize: "11px", marginTop: "2px" }}>
                  {fieldErrors.mobile}
                </span>
              ) : (
                <span style={{ color: "#8a9b96", fontSize: "10px", marginTop: "2px" }}>
                  Must be exactly 10 digits starting with 6, 7, 8, or 9
                </span>
              )}
            </label>

            <label>
              <span>Email</span>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, email: true }));
                  const res = validateEmail(formData.email);
                  setFieldErrors((prev) => ({ ...prev, email: res.valid ? undefined : res.error }));
                }}
                placeholder="Enter email (e.g. accounts@abcindustries.in)"
                style={fieldErrors.email ? { borderColor: "#b45e4d" } : undefined}
              />
              {fieldErrors.email ? (
                <span style={{ color: "#b45e4d", fontSize: "11px", marginTop: "2px" }}>
                  {fieldErrors.email}
                </span>
              ) : (
                <span style={{ color: "#8a9b96", fontSize: "10px", marginTop: "2px" }}>
                  Optional. Business domains supported (e.g. accounts@abcindustries.in)
                </span>
              )}
            </label>

            <label>
              <span>GST number (Optional)</span>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={(e) => handleGstinChange(e.target.value)}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, gstNumber: true }));
                  const res = validateGstin(formData.gstNumber);
                  setFieldErrors((prev) => ({ ...prev, gstNumber: res.valid ? undefined : res.error }));
                }}
                placeholder="15-character GSTIN (e.g. 27AAAAA0000A1Z5)"
                maxLength={15}
                style={fieldErrors.gstNumber ? { borderColor: "#b45e4d" } : undefined}
              />
              {fieldErrors.gstNumber ? (
                <span style={{ color: "#b45e4d", fontSize: "11px", marginTop: "2px" }}>
                  {fieldErrors.gstNumber}
                </span>
              ) : (
                <span style={{ color: "#8a9b96", fontSize: "10px", marginTop: "2px" }}>
                  Optional. 15-character uppercase alphanumeric format
                </span>
              )}
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <span>Address</span>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Enter company address"
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "20px" }}>
            <button
              className={styles.saveButton}
              type="submit"
              disabled={isSubmitting}
              style={{ marginTop: 0 }}
            >
              {isSubmitting ? "Saving..." : editingId ? "Update company" : "Save details"}
            </button>
            {editingId && (
              <button
                type="button"
                className={styles.secondaryButton}
                style={{ marginTop: 0 }}
                onClick={cancelEdit}
              >
                Cancel
              </button>
            )}
          </div>

          {formMessage && (
            <p className={formMessage.type === "success" ? styles.successMessage : styles.errorMessage}>
              {formMessage.text}
            </p>
          )}
        </form>
      </section>
    </FeaturePage>
  );
}
