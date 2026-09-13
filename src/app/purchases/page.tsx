"use client";

import { useCallback, useEffect, useState } from "react";
import { DataPanel, FeaturePage, SummaryCards, type FeatureRow } from "@/components/FeaturePage";
import styles from "@/components/FeaturePage.module.css";
import { formatLineItem, formatQuantity } from "@/lib/quantity";

type Supplier = {
  id: string;
  name: string;
  type: "SUPPLIER" | "BUYER" | "BOTH";
  mobile: string | null;
  payableBalance: string | number;
};

type ScrapType = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  currentStock: string | number;
};

type PurchaseItem = {
  id: string;
  quantity: string | number;
  rate: string | number;
  amount: string | number;
  scrapType: {
    id: string;
    name: string;
    unit: string;
  };
};

type Purchase = {
  id: string;
  supplierId: string;
  supplier: {
    id: string;
    name: string;
    mobile: string | null;
  };
  purchaseDate: string;
  notes: string | null;
  totalAmount: string | number;
  amountPaid: string | number;
  outstandingAmount: string | number;
  status: "UNPAID" | "PARTIAL" | "PAID";
  items: PurchaseItem[];
  payments: Array<{ id: string; amount: string | number }>;
  createdAt: string;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [scrapTypes, setScrapTypes] = useState<ScrapType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [scrapTypeId, setScrapTypeId] = useState("");
  const [unit, setUnit] = useState("Tonne (MT)");
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [amountPaid, setAmountPaid] = useState("0");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [purchasesRes, companiesRes, scrapRes] = await Promise.all([
        fetch("/api/purchases"),
        fetch("/api/companies"),
        fetch("/api/scrap-types"),
      ]);

      if (!purchasesRes.ok) {
        throw new Error(`Failed to load purchases (status ${purchasesRes.status})`);
      }
      if (!companiesRes.ok) {
        throw new Error(`Failed to load companies (status ${companiesRes.status})`);
      }
      if (!scrapRes.ok) {
        throw new Error(`Failed to load scrap types (status ${scrapRes.status})`);
      }

      const [purchasesData, companiesData, scrapData] = await Promise.all([
        purchasesRes.json(),
        companiesRes.json(),
        scrapRes.json(),
      ]);

      setPurchases(purchasesData);
      setSuppliers(companiesData.filter((c: Supplier) => c.type === "SUPPLIER" || c.type === "BOTH"));
      setScrapTypes(scrapData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load purchases data";
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

  const selectedScrapType = scrapTypes.find((s) => s.id === scrapTypeId);
  const calculatedTotal = (Number(quantity) || 0) * (Number(rate) || 0);
  const numPaid = Number(amountPaid) || 0;
  const remainingPayable = Math.max(calculatedTotal - numPaid, 0);

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!supplierId) {
      setFormError("Please select a supplier company.");
      return;
    }
    if (!scrapTypeId) {
      setFormError("Please select a scrap material.");
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setFormError("Quantity must be greater than 0.");
      return;
    }
    const rt = Number(rate);
    if (!rt || rt <= 0) {
      setFormError("Rate per unit must be greater than 0.");
      return;
    }
    const paid = Number(amountPaid) || 0;
    if (paid < 0) {
      setFormError("Amount paid cannot be negative.");
      return;
    }
    if (paid > calculatedTotal) {
      setFormError("Amount paid cannot exceed purchase total.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        supplierId,
        purchaseDate: new Date(purchaseDate).toISOString(),
        notes: notes.trim() || undefined,
        amountPaid: paid,
        items: [
          {
            scrapTypeId,
            quantity: qty,
            rate: rt,
            unit,
          },
        ],
      };

      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to record purchase (status ${res.status})`);
      }

      setFormSuccess("Purchase recorded successfully! Stock and supplier payable updated.");
      setQuantity("");
      setRate("");
      setAmountPaid("0");
      setNotes("");
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record purchase";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Summary Metrics
  const now = new Date();
  const currentMonthPurchases = purchases.filter((p) => {
    const d = new Date(p.purchaseDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const monthPurchaseTotal = currentMonthPurchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
  const monthPaidTotal = currentMonthPurchases.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
  const totalStillToPay = purchases.reduce((sum, p) => sum + (Number(p.outstandingAmount) || 0), 0);
  const monthQuantityBought = currentMonthPurchases.reduce((sum, p) => {
    return sum + p.items.reduce((itemSum, item) => itemSum + (Number(item.quantity) || 0), 0);
  }, 0);

  const purchaseRows: FeatureRow[] = purchases.map((p) => {
    const itemsText = p.items.map((i) => formatLineItem(i.quantity, i.amount, i.scrapType.name)).join(", ");
    const dateText = new Date(p.purchaseDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const statusLabel = p.status === "PAID" ? "Paid" : p.status === "PARTIAL" ? "Partial" : "Unpaid";
    const tone = p.status === "PAID" ? ("green" as const) : p.status === "PARTIAL" ? ("amber" as const) : ("red" as const);
    const remaining = Number(p.outstandingAmount) || 0;

    return {
      id: p.id,
      title: p.supplier.name,
      subtitle: `${itemsText} · ${dateText}${p.notes ? ` · (${p.notes})` : ""}`,
      amount: remaining > 0 ? `₹${Number(p.totalAmount).toLocaleString("en-IN")} (Due: ₹${remaining.toLocaleString("en-IN")})` : `₹${Number(p.totalAmount).toLocaleString("en-IN")}`,
      status: statusLabel,
      tone,
    };
  });

  return (
    <FeaturePage active="/purchases" eyebrow="BUY SCRAP" title="Buy scrap" description="Record scrap purchased from suppliers and track what you still need to pay." actionLabel="New purchase" actionHref="#form">
      <SummaryCards cards={[
        { label: "Purchases this month", value: formatCurrency(monthPurchaseTotal), note: `${currentMonthPurchases.length} purchases recorded`, tone: "amber" },
        { label: "Quantity bought", value: formatQuantity(monthQuantityBought), note: "This month across materials", tone: "green" },
        { label: "Paid to suppliers", value: formatCurrency(monthPaidTotal), note: "Payments made with purchases", tone: "blue" },
        { label: "Still to pay", value: formatCurrency(totalStillToPay), note: totalStillToPay > 0 ? "Pending to suppliers" : "No payable amount", tone: "red" }
      ]} />

      <DataPanel
        title="Recent purchases"
        subtitle="Every purchase increases your stock and updates supplier ledger"
        rows={purchaseRows}
        loading={loading}
        error={error}
        emptyText={loading ? "Loading purchases..." : "No purchases recorded yet. Record a purchase below to update inventory and supplier balances."}
      />

      <section className={styles.panel} id="form">
        <div className={styles.panelHeader}>
          <div>
            <h2>Record a purchase</h2>
            <p>Enter purchase details below. Available stock and supplier payable ledger will be updated automatically in the database.</p>
          </div>
        </div>

        {suppliers.length === 0 && !loading && (
          <p className={styles.errorMessage} style={{ margin: "14px 0" }}>
            No suppliers found. Please <a href="/companies#form" style={{ textDecoration: "underline", fontWeight: 700 }}>add a supplier company</a> first.
          </p>
        )}
        {scrapTypes.length === 0 && !loading && (
          <p className={styles.errorMessage} style={{ margin: "14px 0" }}>
            No scrap materials found. Please <a href="/stock#form" style={{ textDecoration: "underline", fontWeight: 700 }}>add a scrap type</a> first.
          </p>
        )}

        <form onSubmit={handlePurchaseSubmit}>
          <div className={styles.formGrid}>
            <label>
              Supplier company *
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                <option value="">Select a supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.type === "BOTH" ? "Supplier & Buyer" : "Supplier"})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Purchase date *
              <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
            </label>

            <label>
              Scrap material *
              <select
                value={scrapTypeId}
                onChange={(e) => {
                  const id = e.target.value;
                  setScrapTypeId(id);
                  const match = scrapTypes.find((s) => s.id === id);
                  if (match?.unit) {
                    setUnit(match.unit);
                  }
                }}
                required
              >
                <option value="">Select scrap material</option>
                {scrapTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · Current stock: {formatQuantity(t.currentStock)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Unit *
              <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="Tonne (MT)">Tonne (MT)</option>
                <option value="kg">kg</option>
              </select>
            </label>

            <label>
              Quantity ({unit}) *
              <input
                type="number"
                step="any"
                min="0.001"
                placeholder={unit.toLowerCase().includes("tonne") ? "e.g. 25 or 25.5" : "e.g. 750"}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              {selectedScrapType && (
                <small style={{ color: "#567065" }}>
                  Current yard stock: {formatQuantity(selectedScrapType.currentStock)}
                </small>
              )}
            </label>

            <label>
              Rate per {unit} (₹) *
              <input
                type="number"
                step="any"
                min="0.01"
                placeholder={unit.toLowerCase().includes("tonne") ? "e.g. 40000" : "e.g. 40"}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                required
              />
            </label>

            <label>
              Amount paid now (₹)
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Notes / Vehicle / Gate pass
              <input
                type="text"
                placeholder="Optional notes or vehicle number"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>

          <div className={styles.billTotal}>
            <span>Calculated purchase total</span>
            <strong>{formatCurrency(calculatedTotal)}</strong>
            <small>
              Paid now: {formatCurrency(numPaid)} · Remaining payable to supplier: {formatCurrency(remainingPayable)}
            </small>
          </div>

          <button className={styles.saveButton} type="submit" disabled={isSubmitting || suppliers.length === 0 || scrapTypes.length === 0}>
            {isSubmitting ? "Recording purchase..." : "Record purchase"}
          </button>

          {formSuccess && <p className={styles.successMessage}>{formSuccess}</p>}
          {formError && <p className={styles.errorMessage}>{formError}</p>}
        </form>
      </section>
    </FeaturePage>
  );
}

