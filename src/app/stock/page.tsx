"use client";

import { useCallback, useEffect, useState } from "react";
import { DataPanel, FeaturePage, SummaryCards, type FeatureRow } from "@/components/FeaturePage";
import styles from "@/components/FeaturePage.module.css";
import { formatQuantity } from "@/lib/quantity";
import { DeleteScrapTypeModal } from "@/components/DeleteScrapTypeModal";

type ScrapType = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  currentStock: string | number;
  notes: string | null;
  createdAt: string;
};

type StockMovement = {
  id: string;
  type: "PURCHASE" | "SALE" | "OPENING" | "ADJUSTMENT";
  quantity: string | number;
  occurredAt: string;
  scrapType: { unit: string };
};

const CATEGORIES = [
  "Ferrous Metal",
  "Non-Ferrous Metal",
  "Plastic",
  "Paper & Cardboard",
  "E-waste",
  "Battery",
  "Rubber",
  "Glass",
  "Other",
];

export default function StockPage() {
  const [scrapTypes, setScrapTypes] = useState<ScrapType[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<FeatureRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form & Edit state (ONLY Scrap Type Name and Category)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
  });
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    category?: string;
  }>({});
  const [touched, setTouched] = useState<{
    name?: boolean;
    category?: boolean;
  }>({});
  const [formMessage, setFormMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
    });
    setFieldErrors({});
    setTouched({});
    setEditingId(null);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stRes, movRes] = await Promise.all([
        fetch("/api/scrap-types"),
        fetch("/api/stock/movements?take=200"),
      ]);

      if (!stRes.ok) throw new Error("Failed to load scrap types");
      if (!movRes.ok) throw new Error("Failed to load stock movements");

      const stData = await stRes.json();
      const movData = await movRes.json();

      setScrapTypes(Array.isArray(stData) ? stData : []);
      setMovements(Array.isArray(movData) ? movData : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load stock data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        void loadData();
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadData]);

  // Unicode-safe normalization and validation
  const validateName = (name: string, currentEditingId: string | null): string | undefined => {
    const trimmed = name.trim();
    if (!trimmed) {
      return "Scrap type name is required.";
    }
    const normInput = trimmed.normalize("NFC").toLowerCase();
    const duplicate = scrapTypes.find(
      (s) =>
        s.id !== currentEditingId &&
        s.name.trim().normalize("NFC").toLowerCase() === normInput
    );
    if (duplicate) {
      return `A scrap type named "${duplicate.name}" already exists.`;
    }
    return undefined;
  };

  const validateCategory = (category: string): string | undefined => {
    const trimmed = category.trim();
    if (!trimmed) {
      return "Category is required.";
    }
    return undefined;
  };

  const handleNameChange = (val: string) => {
    setFormData((prev) => ({ ...prev, name: val }));
    if (touched.name || val.trim().length > 0) {
      const err = validateName(val, editingId);
      setFieldErrors((prev) => ({ ...prev, name: err }));
    }
  };

  const handleCategoryChange = (val: string) => {
    setFormData((prev) => ({ ...prev, category: val }));
    if (touched.category || val.trim().length > 0) {
      const err = validateCategory(val);
      setFieldErrors((prev) => ({ ...prev, category: err }));
    }
  };

  const startEdit = (scrapType: ScrapType) => {
    setEditingId(scrapType.id);
    setFormData({
      name: scrapType.name,
      category: scrapType.category || "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, category: true });

    const nameErr = validateName(formData.name, editingId);
    const catErr = validateCategory(formData.category);

    const newErrors: { name?: string; category?: string } = {};
    if (nameErr) newErrors.name = nameErr;
    if (catErr) newErrors.category = catErr;
    setFieldErrors(newErrors);

    if (nameErr || catErr) {
      setFormMessage({
        type: "error",
        text: nameErr || catErr || "Please fill in all required fields.",
      });
      return;
    }

    setIsSubmitting(true);
    setFormMessage(null);
    setDeleteStatus(null);

    const trimmedName = formData.name.trim();
    const trimmedCategory = formData.category.trim();

    try {
      if (editingId) {
        // Edit existing scrap type
        const res = await fetch(`/api/scrap-types/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            category: trimmedCategory,
          }),
        });

        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error || "Failed to update scrap type.");
        }

        setFormMessage({
          type: "success",
          text: `Scrap type "${trimmedName}" updated successfully.`,
        });
        resetForm();
        await loadData();
      } else {
        // Add new scrap type
        const res = await fetch("/api/scrap-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            category: trimmedCategory,
          }),
        });

        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error || "Failed to add scrap type.");
        }

        setFormMessage({
          type: "success",
          text: `Scrap type "${trimmedName}" added successfully.`,
        });
        resetForm();
        await loadData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save scrap type.";
      setFormMessage({ type: "error", text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteScrapType = async () => {
    if (!deleteTarget || !deleteTarget.id) return;
    setIsDeleting(true);
    setDeleteStatus(null);
    try {
      const res = await fetch(`/api/scrap-types/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorText =
          body.error ||
          "This scrap type cannot be deleted because it is being used by existing purchase or sale records.";
        setDeleteStatus({ type: "error", text: errorText });
        setDeleteTarget(null);
        return;
      }

      setDeleteStatus({
        type: "success",
        text: `Scrap type "${deleteTarget.title}" deleted successfully.`,
      });

      if (editingId === deleteTarget.id) {
        cancelEdit();
      }

      setDeleteTarget(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error deleting scrap type.";
      setDeleteStatus({ type: "error", text: msg });
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculations for KPI cards
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const totalAvailable = scrapTypes.reduce((acc, s) => acc + Number(s.currentStock), 0);
  const lowStockCount = scrapTypes.filter((s) => Number(s.currentStock) <= 0).length;

  const boughtThisMonth = movements
    .filter((m) => m.type === "PURCHASE" && m.occurredAt.startsWith(currentMonthPrefix))
    .reduce((acc, m) => acc + Math.abs(Number(m.quantity)), 0);

  const soldThisMonth = movements
    .filter((m) => m.type === "SALE" && m.occurredAt.startsWith(currentMonthPrefix))
    .reduce((acc, m) => acc + Math.abs(Number(m.quantity)), 0);

  const rows: FeatureRow[] = scrapTypes.map((s) => ({
    id: s.id,
    title: s.name,
    subtitle: s.category ? `Category: ${s.category}` : "Uncategorized",
    amount: formatQuantity(s.currentStock),
    status: Number(s.currentStock) > 0 ? "In Stock" : "Out of Stock",
    tone: Number(s.currentStock) > 0 ? "green" : "red",
    actionLabel: "Edit",
    onAction: () => startEdit(s),
  }));

  return (
    <FeaturePage
      active="/stock"
      eyebrow="INVENTORY & MATERIALS"
      title="Scrap stock"
      description="Manage scrap types, track yard stock, and review material movements."
      actionLabel="Add scrap type"
      actionHref="#form"
    >
      <SummaryCards
        cards={[
          {
            label: "Available stock",
            value: formatQuantity(totalAvailable),
            note: `${scrapTypes.length} scrap types registered`,
            tone: "green",
          },
          {
            label: "Bought this month",
            value: formatQuantity(boughtThisMonth),
            note: "Recorded from inward purchases",
            tone: "amber",
          },
          {
            label: "Sold this month",
            value: formatQuantity(soldThisMonth),
            note: "Recorded from outward sales",
            tone: "blue",
          },
          {
            label: "Zero stock items",
            value: `${lowStockCount}`,
            note: lowStockCount > 0 ? "Materials need replenishment" : "All materials in stock",
            tone: lowStockCount > 0 ? "red" : "green",
          },
        ]}
      />

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
        title="Scrap Types & Stock"
        subtitle="Commercial scrap materials purchased, sold, and tracked in inventory"
        allowDelete
        onRequestDelete={(row) => setDeleteTarget(row)}
        deleteTitle="Delete scrap type"
        rows={rows}
        loading={loading}
        error={error}
        emptyText="No scrap types added yet. Use the form below to register your first scrap material."
      />

      <DeleteScrapTypeModal
        isOpen={Boolean(deleteTarget)}
        scrapTypeName={deleteTarget?.title || ""}
        isDeleting={isDeleting}
        onConfirm={confirmDeleteScrapType}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
      />

      <section className={styles.panel} id="form">
        <div className={styles.panelHeader}>
          <div>
            <h2>
              {editingId
                ? `Edit scrap type: ${formData.name || "Material"}`
                : "Add a scrap type"}
            </h2>
            <p>
              {editingId
                ? "Update material details below and click Update Scrap Type."
                : "Enter details below to register a scrap material for purchasing and selling."}
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
              <span>
                Scrap Type Name <span style={{ color: "#b45e4d" }}>*</span>
              </span>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, name: true }));
                  const err = validateName(formData.name, editingId);
                  setFieldErrors((prev) => ({ ...prev, name: err }));
                }}
                placeholder="e.g. Copper, Brass, Cast Iron, लोखंड, तांबे, पितळ"
                style={fieldErrors.name ? { borderColor: "#b45e4d" } : undefined}
              />
              {fieldErrors.name ? (
                <span style={{ color: "#b45e4d", fontSize: "11px", marginTop: "2px" }}>
                  {fieldErrors.name}
                </span>
              ) : (
                <span style={{ color: "#8a9b96", fontSize: "10px", marginTop: "2px" }}>
                  Enter material name in English, Marathi, or local language
                </span>
              )}
            </label>

            <label>
              <span>
                Category <span style={{ color: "#b45e4d" }}>*</span>
              </span>
              <select
                value={formData.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, category: true }));
                  const err = validateCategory(formData.category);
                  setFieldErrors((prev) => ({ ...prev, category: err }));
                }}
                style={fieldErrors.category ? { borderColor: "#b45e4d" } : undefined}
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                {formData.category && !CATEGORIES.includes(formData.category) && (
                  <option value={formData.category}>{formData.category}</option>
                )}
              </select>
              {fieldErrors.category ? (
                <span style={{ color: "#b45e4d", fontSize: "11px", marginTop: "2px" }}>
                  {fieldErrors.category}
                </span>
              ) : (
                <span style={{ color: "#8a9b96", fontSize: "10px", marginTop: "2px" }}>
                  Select the scrap category
                </span>
              )}
            </label>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "20px" }}>
            <button
              className={styles.saveButton}
              type="submit"
              disabled={isSubmitting}
              style={{ marginTop: 0 }}
            >
              {isSubmitting
                ? "Saving..."
                : editingId
                ? "Update Scrap Type"
                : "Save Scrap Type"}
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
            <p
              className={
                formMessage.type === "success" ? styles.successMessage : styles.errorMessage
              }
            >
              {formMessage.text}
            </p>
          )}
        </form>
      </section>
    </FeaturePage>
  );
}
