"use client";

import { useCallback, useEffect, useState } from "react";
import { DataPanel, FeaturePage, SummaryCards, type FeatureRow } from "@/components/FeaturePage";
import styles from "@/components/FeaturePage.module.css";
import { formatLineItem, formatQuantity, isTonneUnit } from "@/lib/quantity";

type Buyer = {
  id: string;
  name: string;
  type: "SUPPLIER" | "BUYER" | "BOTH";
  mobile: string | null;
  receivableBalance: string | number;
};

type ScrapType = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  currentStock: string | number;
};

type SaleItem = {
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

type Sale = {
  id: string;
  buyerId: string;
  buyer: {
    id: string;
    name: string;
    mobile: string | null;
  };
  saleDate: string;
  notes: string | null;
  totalAmount: string | number;
  amountReceived: string | number;
  outstandingAmount: string | number;
  status: "UNPAID" | "PARTIAL" | "PAID";
  items: SaleItem[];
  payments: Array<{ id: string; amount: string | number }>;
  createdAt: string;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [scrapTypes, setScrapTypes] = useState<ScrapType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [buyerId, setBuyerId] = useState("");
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [scrapTypeId, setScrapTypeId] = useState("");
  const [unit, setUnit] = useState("Tonne (MT)");
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [amountReceived, setAmountReceived] = useState("0");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [salesRes, companiesRes, scrapRes] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/companies"),
        fetch("/api/scrap-types"),
      ]);

      if (!salesRes.ok) {
        throw new Error(`Failed to load sales (status ${salesRes.status})`);
      }
      if (!companiesRes.ok) {
        throw new Error(`Failed to load companies (status ${companiesRes.status})`);
      }
      if (!scrapRes.ok) {
        throw new Error(`Failed to load scrap types (status ${scrapRes.status})`);
      }

      const [salesData, companiesData, scrapData] = await Promise.all([
        salesRes.json(),
        companiesRes.json(),
        scrapRes.json(),
      ]);

      setSales(salesData);
      setBuyers(companiesData.filter((c: Buyer) => c.type === "BUYER" || c.type === "BOTH"));
      setScrapTypes(scrapData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load sales data";
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
  const availableStockKg = selectedScrapType ? Number(selectedScrapType.currentStock) || 0 : 0;
  const numQuantity = Number(quantity) || 0;
  const numRate = Number(rate) || 0;
  const calculatedTotal = numQuantity * numRate;
  const numReceived = Number(amountReceived) || 0;
  const remainingReceivable = Math.max(calculatedTotal - numReceived, 0);
  const enteredQtyKg = isTonneUnit(unit) ? numQuantity * 1000 : numQuantity;
  const isExceedingStock = selectedScrapType ? enteredQtyKg > availableStockKg : false;

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!buyerId) {
      setFormError("Please select a buyer company.");
      return;
    }
    if (!scrapTypeId) {
      setFormError("Please select a scrap material.");
      return;
    }
    if (numQuantity <= 0) {
      setFormError("Quantity must be greater than 0.");
      return;
    }
    if (enteredQtyKg > availableStockKg) {
      setFormError(
        `Sale quantity (${formatQuantity(enteredQtyKg)}) exceeds available stock (${formatQuantity(availableStockKg)}).`
      );
      return;
    }
    if (numRate <= 0) {
      setFormError("Rate per unit must be greater than 0.");
      return;
    }
    if (numReceived < 0) {
      setFormError("Amount received cannot be negative.");
      return;
    }
    if (numReceived > calculatedTotal) {
      setFormError("Amount received cannot exceed the sale total.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        buyerId,
        saleDate: new Date(saleDate).toISOString(),
        notes: notes.trim() || undefined,
        amountReceived: numReceived,
        items: [
          {
            scrapTypeId,
            quantity: numQuantity,
            rate: numRate,
            unit,
          },
        ],
      };

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to record sale (status ${res.status})`);
      }

      setFormSuccess("Sale created successfully! Stock reduced and buyer receivable ledger updated.");
      setQuantity("");
      setRate("");
      setAmountReceived("0");
      setNotes("");
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record sale";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Summary Metrics
  const now = new Date();
  const currentMonthSales = sales.filter((s) => {
    const d = new Date(s.saleDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const monthSalesTotal = currentMonthSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  const monthReceivedTotal = currentMonthSales.reduce((sum, s) => sum + (Number(s.amountReceived) || 0), 0);
  const totalStillToReceive = sales.reduce((sum, s) => sum + (Number(s.outstandingAmount) || 0), 0);
  const monthQuantitySold = currentMonthSales.reduce((sum, s) => {
    return sum + s.items.reduce((itemSum, item) => itemSum + (Number(item.quantity) || 0), 0);
  }, 0);

  const saleRows: FeatureRow[] = sales.map((s) => {
    const itemsText = s.items.map((i) => formatLineItem(i.quantity, i.amount, i.scrapType.name)).join(", ");
    const dateText = new Date(s.saleDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const statusLabel = s.status === "PAID" ? "Fully paid" : s.status === "PARTIAL" ? "Partial" : "Unpaid / Udhari";
    const tone = s.status === "PAID" ? ("green" as const) : s.status === "PARTIAL" ? ("amber" as const) : ("blue" as const);
    const remaining = Number(s.outstandingAmount) || 0;

    return {
      id: s.id,
      title: s.buyer.name,
      subtitle: `${itemsText} · ${dateText}${s.notes ? ` · (${s.notes})` : ""}`,
      amount: remaining > 0 ? `₹${Number(s.totalAmount).toLocaleString("en-IN")} (Due: ₹${remaining.toLocaleString("en-IN")})` : `₹${Number(s.totalAmount).toLocaleString("en-IN")}`,
      status: statusLabel,
      tone,
    };
  });

  return (
    <FeaturePage active="/sales" eyebrow="SELL SCRAP" title="Sell scrap" description="Create deliveries, reduce stock automatically, and see what buyers still owe you." actionLabel="New sale" actionHref="#form">
      <SummaryCards cards={[
        { label: "Sales this month", value: formatCurrency(monthSalesTotal), note: `${currentMonthSales.length} sales recorded`, tone: "blue" },
        { label: "Quantity sold", value: formatQuantity(monthQuantitySold), note: "Delivered this month", tone: "green" },
        { label: "Received from buyers", value: formatCurrency(monthReceivedTotal), note: "Payments collected with sales", tone: "amber" },
        { label: "Still to receive", value: formatCurrency(totalStillToReceive), note: totalStillToReceive > 0 ? "Pending buyer udhari" : "No outstanding udhari", tone: "red" }
      ]} />

      <DataPanel
        title="Recent sales and deliveries"
        subtitle="Every sale automatically reduces available inventory"
        rows={saleRows}
        loading={loading}
        error={error}
        emptyText={loading ? "Loading sales..." : "No sales recorded yet. Record a sale below to dispatch material and track receivables."}
      />

      <section className={styles.panel} id="form">
        <div className={styles.panelHeader}>
          <div>
            <h2>Create a sale or delivery</h2>
            <p>Select a buyer, scrap material, and quantity. Available stock and buyer receivable balance will update automatically in the database.</p>
          </div>
        </div>

        {buyers.length === 0 && !loading && (
          <p className={styles.errorMessage} style={{ margin: "14px 0" }}>
            No buyer companies found. Please <a href="/companies#form" style={{ textDecoration: "underline", fontWeight: 700 }}>add a buyer company</a> first.
          </p>
        )}
        {scrapTypes.length === 0 && !loading && (
          <p className={styles.errorMessage} style={{ margin: "14px 0" }}>
            No scrap materials found. Please <a href="/stock#form" style={{ textDecoration: "underline", fontWeight: 700 }}>add a scrap type</a> first.
          </p>
        )}

        <form onSubmit={handleSaleSubmit}>
          <div className={styles.formGrid}>
            <label>
              Buyer company *
              <select value={buyerId} onChange={(e) => setBuyerId(e.target.value)} required>
                <option value="">Select a buyer</option>
                {buyers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.type === "BOTH" ? "Buyer & Supplier" : "Buyer"})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Sale date *
              <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} required />
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
                    {t.name} · Available: {formatQuantity(t.currentStock)}
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
                <small style={{ color: isExceedingStock ? "#b45e4d" : "#567065", fontWeight: isExceedingStock ? 700 : 400 }}>
                  {isExceedingStock
                    ? `⚠️ Exceeds available stock (${formatQuantity(availableStockKg)})`
                    : `Available in yard: ${formatQuantity(availableStockKg)}`}
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
              Amount received now (₹)
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Notes / Delivery challan / Vehicle number
              <input
                type="text"
                placeholder="Optional notes or vehicle/challan number"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>

          <div className={styles.billTotal}>
            <span>Calculated sale total</span>
            <strong>{formatCurrency(calculatedTotal)}</strong>
            <small>
              Received now: {formatCurrency(numReceived)} · Remaining udhari to collect: {formatCurrency(remainingReceivable)}
            </small>
          </div>

          <button
            className={styles.saveButton}
            type="submit"
            disabled={isSubmitting || buyers.length === 0 || scrapTypes.length === 0 || isExceedingStock}
          >
            {isSubmitting ? "Recording sale..." : "Create sale / delivery"}
          </button>

          {formSuccess && <p className={styles.successMessage}>{formSuccess}</p>}
          {formError && <p className={styles.errorMessage}>{formError}</p>}
        </form>
      </section>
    </FeaturePage>
  );
}

