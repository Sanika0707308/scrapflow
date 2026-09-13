"use client";

import { useCallback, useEffect, useState } from "react";
import { DataPanel, FeaturePage, SummaryCards, type FeatureRow } from "@/components/FeaturePage";
import styles from "@/components/FeaturePage.module.css";

type Company = {
  id: string;
  name: string;
  type: "SUPPLIER" | "BUYER" | "BOTH";
  mobile: string | null;
  payableBalance: string | number;
  receivableBalance: string | number;
};

type LinkedDoc = {
  id: string;
  totalAmount: string | number;
  outstandingAmount: string | number;
};

type PaymentItem = {
  id: string;
  companyId: string;
  company: {
    id: string;
    name: string;
    type: "SUPPLIER" | "BUYER" | "BOTH";
    mobile: string | null;
  };
  direction: "IN" | "OUT";
  paymentDate: string;
  amount: string | number;
  method: string | null;
  notes: string | null;
  purchaseId: string | null;
  saleId: string | null;
  purchase?: LinkedDoc | null;
  sale?: LinkedDoc | null;
  createdAt: string;
};

type Purchase = {
  id: string;
  supplierId: string;
  purchaseDate: string;
  totalAmount: string | number;
  amountPaid: string | number;
  outstandingAmount: string | number;
  status: "UNPAID" | "PARTIAL" | "PAID";
};

type Sale = {
  id: string;
  buyerId: string;
  saleDate: string;
  totalAmount: string | number;
  amountReceived: string | number;
  outstandingAmount: string | number;
  status: "UNPAID" | "PARTIAL" | "PAID";
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [direction, setDirection] = useState<"OUT" | "IN">("OUT");
  const [companyId, setCompanyId] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [selectedTxId, setSelectedTxId] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [paymentsRes, companiesRes, purchasesRes, salesRes] = await Promise.all([
        fetch("/api/payments"),
        fetch("/api/companies"),
        fetch("/api/purchases"),
        fetch("/api/sales"),
      ]);

      if (!paymentsRes.ok) throw new Error(`Failed to load payments (status ${paymentsRes.status})`);
      if (!companiesRes.ok) throw new Error(`Failed to load companies (status ${companiesRes.status})`);
      if (!purchasesRes.ok) throw new Error(`Failed to load purchases (status ${purchasesRes.status})`);
      if (!salesRes.ok) throw new Error(`Failed to load sales (status ${salesRes.status})`);

      const [paymentsData, companiesData, purchasesData, salesData] = await Promise.all([
        paymentsRes.json(),
        companiesRes.json(),
        purchasesRes.json(),
        salesRes.json(),
      ]);

      setPayments(paymentsData);
      setCompanies(companiesData);
      setPurchases(purchasesData);
      setSales(salesData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load payment data";
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

  // Companies filtered by direction
  const eligibleCompanies = companies.filter((c) => {
    if (direction === "OUT") {
      return c.type === "SUPPLIER" || c.type === "BOTH";
    } else {
      return c.type === "BUYER" || c.type === "BOTH";
    }
  });

  const selectedCompany = companies.find((c) => c.id === companyId);
  const companyPayable = selectedCompany ? Number(selectedCompany.payableBalance) || 0 : 0;
  const companyReceivable = selectedCompany ? Number(selectedCompany.receivableBalance) || 0 : 0;

  // Outstanding bills or invoices for the selected company
  const companyUnpaidPurchases = purchases.filter(
    (p) => p.supplierId === companyId && Number(p.outstandingAmount) > 0
  );
  const companyUnpaidSales = sales.filter(
    (s) => s.buyerId === companyId && Number(s.outstandingAmount) > 0
  );

  const selectedPurchase = companyUnpaidPurchases.find((p) => p.id === selectedTxId);
  const selectedSale = companyUnpaidSales.find((s) => s.id === selectedTxId);

  // Maximum payment amount permitted based on selection
  const maxAllowedAmount =
    direction === "OUT"
      ? selectedPurchase
        ? Number(selectedPurchase.outstandingAmount)
        : companyPayable
      : selectedSale
        ? Number(selectedSale.outstandingAmount)
        : companyReceivable;

  const numAmount = Number(amount) || 0;
  const isExceedingOutstanding = selectedCompany ? numAmount > maxAllowedAmount : false;
  const remainingOutstandingAfter = Math.max(maxAllowedAmount - numAmount, 0);

  const handleDirectionChange = (newDirection: "OUT" | "IN") => {
    setDirection(newDirection);
    setCompanyId("");
    setSelectedTxId("");
    setAmount("");
    setFormError(null);
    setFormSuccess(null);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!companyId) {
      setFormError("Please select a company.");
      return;
    }

    if (numAmount <= 0) {
      setFormError("Payment amount must be greater than 0.");
      return;
    }

    if (maxAllowedAmount <= 0) {
      setFormError(
        direction === "OUT"
          ? "This supplier currently has no outstanding payable balance."
          : "This buyer currently has no outstanding receivable balance."
      );
      return;
    }

    if (numAmount > maxAllowedAmount) {
      setFormError(
        `Payment amount (${formatCurrency(numAmount)}) exceeds the outstanding balance (${formatCurrency(maxAllowedAmount)}).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        companyId,
        direction,
        paymentDate: new Date(paymentDate).toISOString(),
        amount: numAmount,
        method: method.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (direction === "OUT" && selectedTxId) {
        payload.purchaseId = selectedTxId;
      }
      if (direction === "IN" && selectedTxId) {
        payload.saleId = selectedTxId;
      }

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to record payment (status ${res.status})`);
      }

      setFormSuccess(
        direction === "OUT"
          ? `Payment of ${formatCurrency(numAmount)} to ${selectedCompany?.name} recorded successfully! Supplier payable balance and ledger updated.`
          : `Payment of ${formatCurrency(numAmount)} from ${selectedCompany?.name} received successfully! Buyer receivable balance and ledger updated.`
      );
      setAmount("");
      setSelectedTxId("");
      setNotes("");
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record payment";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Summary Metrics
  const now = new Date();
  const currentMonthPayments = payments.filter((p) => {
    const d = new Date(p.paymentDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const monthReceived = currentMonthPayments
    .filter((p) => p.direction === "IN")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const monthPaid = currentMonthPayments
    .filter((p) => p.direction === "OUT")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const pendingCompanies = companies.filter(
    (c) => (Number(c.payableBalance) || 0) > 0 || (Number(c.receivableBalance) || 0) > 0
  );

  const paymentRows: FeatureRow[] = payments.map((p) => {
    const isIncoming = p.direction === "IN";
    const dateText = new Date(p.paymentDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const methodText = p.method ? ` · ${p.method}` : "";
    const againstText = p.purchaseId
      ? ` · Bill #${p.purchaseId.slice(0, 8)}`
      : p.saleId
        ? ` · Invoice #${p.saleId.slice(0, 8)}`
        : " · Auto FIFO allocation";
    const notesText = p.notes ? ` · (${p.notes})` : "";

    return {
      id: p.id,
      title: p.company.name,
      subtitle: `${isIncoming ? "Payment IN" : "Payment OUT"} · ${dateText}${methodText}${againstText}${notesText}`,
      amount: `${isIncoming ? "+" : "-"}${formatCurrency(Number(p.amount) || 0)}`,
      status: isIncoming ? "Payment In" : "Payment Out",
      tone: isIncoming ? ("green" as const) : ("amber" as const),
    };
  });

  return (
    <FeaturePage
      active="/payments"
      eyebrow="MONEY MOVEMENT"
      title="Payments"
      description="Record money paid to suppliers and money received from buyers."
      actionLabel="Record payment"
      actionHref="#form"
    >
      <SummaryCards
        cards={[
          {
            label: "Received this month",
            value: formatCurrency(monthReceived),
            note: `${currentMonthPayments.filter((p) => p.direction === "IN").length} collections this month`,
            tone: "green",
          },
          {
            label: "Paid this month",
            value: formatCurrency(monthPaid),
            note: `${currentMonthPayments.filter((p) => p.direction === "OUT").length} supplier payments`,
            tone: "amber",
          },
          {
            label: "Payments recorded",
            value: String(payments.length),
            note: `${currentMonthPayments.length} recorded this month`,
            tone: "blue",
          },
          {
            label: "Pending follow-ups",
            value: String(pendingCompanies.length),
            note:
              pendingCompanies.length > 0
                ? `${pendingCompanies.length} companies with open balance`
                : "All accounts cleared",
            tone: pendingCompanies.length > 0 ? "red" : "green",
          },
        ]}
      />

      <DataPanel
        title="Payment history"
        subtitle="Full ledger-backed payment register with automatic allocation"
        rows={paymentRows}
        loading={loading}
        error={error}
        emptyText={
          loading
            ? "Loading payments..."
            : "No payments recorded yet. Record a payment below to adjust payable or receivable balances."
        }
      />

      <section className={styles.panel} id="form">
        <div className={styles.panelHeader}>
          <div>
            <h2>Record a payment</h2>
            <p>
              Choose whether you are paying a supplier or collecting from a buyer. Balances and double-entry ledger entries will update automatically.
            </p>
          </div>
        </div>

        {/* Direction Switcher */}
        <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
          <button
            type="button"
            onClick={() => handleDirectionChange("OUT")}
            style={{
              flex: 1,
              padding: "11px 16px",
              borderRadius: "6px",
              border: direction === "OUT" ? "2px solid #ae762b" : "1px solid #dfe8e4",
              background: direction === "OUT" ? "#fbf5ec" : "#fff",
              color: direction === "OUT" ? "#8c5614" : "#536763",
              fontWeight: direction === "OUT" ? 700 : 500,
              cursor: "pointer",
              fontSize: "13px",
              transition: "all 0.15s ease",
            }}
          >
            💸 Pay to Supplier (Payment OUT)
          </button>
          <button
            type="button"
            onClick={() => handleDirectionChange("IN")}
            style={{
              flex: 1,
              padding: "11px 16px",
              borderRadius: "6px",
              border: direction === "IN" ? "2px solid #39816b" : "1px solid #dfe8e4",
              background: direction === "IN" ? "#edf8f3" : "#fff",
              color: direction === "IN" ? "#24604e" : "#536763",
              fontWeight: direction === "IN" ? 700 : 500,
              cursor: "pointer",
              fontSize: "13px",
              transition: "all 0.15s ease",
            }}
          >
            💰 Receive from Buyer (Payment IN)
          </button>
        </div>

        {eligibleCompanies.length === 0 && !loading && (
          <p className={styles.errorMessage} style={{ margin: "14px 0" }}>
            No {direction === "OUT" ? "supplier" : "buyer"} companies found. Please{" "}
            <a href="/companies#form" style={{ textDecoration: "underline", fontWeight: 700 }}>
              add a company
            </a>{" "}
            first.
          </p>
        )}

        <form onSubmit={handlePaymentSubmit}>
          <div className={styles.formGrid}>
            <label>
              {direction === "OUT" ? "Supplier company *" : "Buyer company *"}
              <select
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  setSelectedTxId("");
                  setAmount("");
                }}
                required
              >
                <option value="">
                  {direction === "OUT" ? "Select a supplier" : "Select a buyer"}
                </option>
                {eligibleCompanies.map((c) => {
                  const balance =
                    direction === "OUT"
                      ? Number(c.payableBalance) || 0
                      : Number(c.receivableBalance) || 0;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} · {direction === "OUT" ? "Owed: " : "Due: "}
                      {formatCurrency(balance)}
                    </option>
                  );
                })}
              </select>
              {selectedCompany && (
                <small
                  style={{
                    color: maxAllowedAmount > 0 ? "#39816b" : "#ae762b",
                    fontWeight: 600,
                  }}
                >
                  {direction === "OUT"
                    ? `Current payable balance: ${formatCurrency(companyPayable)}`
                    : `Current receivable balance: ${formatCurrency(companyReceivable)}`}
                </small>
              )}
            </label>

            <label>
              Payment date *
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </label>

            <label>
              Link to {direction === "OUT" ? "Purchase Bill" : "Sale Invoice"} (Optional)
              <select
                value={selectedTxId}
                onChange={(e) => {
                  setSelectedTxId(e.target.value);
                  setAmount("");
                }}
                disabled={!companyId}
              >
                <option value="">Automatic / FIFO (Allocate across oldest unpaid items)</option>
                {direction === "OUT"
                  ? companyUnpaidPurchases.map((p) => (
                      <option key={p.id} value={p.id}>
                        Bill #{p.id.slice(0, 8)} ({new Date(p.purchaseDate).toLocaleDateString("en-IN")}) · Due: {formatCurrency(Number(p.outstandingAmount))}
                      </option>
                    ))
                  : companyUnpaidSales.map((s) => (
                      <option key={s.id} value={s.id}>
                        Invoice #{s.id.slice(0, 8)} ({new Date(s.saleDate).toLocaleDateString("en-IN")}) · Due: {formatCurrency(Number(s.outstandingAmount))}
                      </option>
                    ))}
              </select>
              {selectedPurchase && (
                <small style={{ color: "#567065" }}>
                  Selected bill outstanding: {formatCurrency(Number(selectedPurchase.outstandingAmount))}
                </small>
              )}
              {selectedSale && (
                <small style={{ color: "#567065" }}>
                  Selected invoice outstanding: {formatCurrency(Number(selectedSale.outstandingAmount))}
                </small>
              )}
            </label>

            <label>
              Payment method *
              <select value={method} onChange={(e) => setMethod(e.target.value)} required>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Amount (₹) *
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder={`Max allowed: ${formatCurrency(maxAllowedAmount)}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  style={{ flex: "1 1 180px", minWidth: "0" }}
                />
                {maxAllowedAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(maxAllowedAmount))}
                    style={{
                      padding: "0 14px",
                      minHeight: "44px",
                      border: "1px solid #dfe8e4",
                      borderRadius: "6px",
                      background: "#f5f7f6",
                      color: "#182625",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flex: "0 0 auto",
                    }}
                  >
                    Pay Full ({formatCurrency(maxAllowedAmount)})
                  </button>
                )}
              </div>
              {selectedCompany && (
                <small
                  style={{
                    color: isExceedingOutstanding ? "#b45e4d" : "#567065",
                    fontWeight: isExceedingOutstanding ? 700 : 400,
                  }}
                >
                  {isExceedingOutstanding
                    ? `⚠️ Amount exceeds outstanding balance (${formatCurrency(maxAllowedAmount)})`
                    : `Max payable: ${formatCurrency(maxAllowedAmount)}`}
                </small>
              )}
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Notes / Transaction ID / UTR / Cheque Number
              <input
                type="text"
                placeholder="e.g. UTR12345678, Cheque #000124, or cash memo reference"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>

          <div className={styles.billTotal}>
            <span>
              {direction === "OUT" ? "Total amount to pay" : "Total amount to collect"}
            </span>
            <strong>{formatCurrency(numAmount)}</strong>
            <small>
              {direction === "OUT" ? "Supplier" : "Buyer"}: {selectedCompany?.name || "None selected"} · Remaining balance after this payment: {formatCurrency(remainingOutstandingAfter)}
            </small>
          </div>

          <button
            className={styles.saveButton}
            type="submit"
            disabled={
              isSubmitting ||
              !companyId ||
              numAmount <= 0 ||
              isExceedingOutstanding ||
              maxAllowedAmount <= 0
            }
          >
            {isSubmitting
              ? "Recording payment..."
              : direction === "OUT"
                ? "Record supplier payment"
                : "Record buyer collection"}
          </button>

          {formSuccess && <p className={styles.successMessage}>{formSuccess}</p>}
          {formError && <p className={styles.errorMessage}>{formError}</p>}
        </form>
      </section>
    </FeaturePage>
  );
}

