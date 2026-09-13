"use client";

import { useCallback, useEffect, useState } from "react";
import { DataPanel, FeaturePage, SummaryCards, type FeatureRow } from "@/components/FeaturePage";
import styles from "@/components/FeaturePage.module.css";

type UdhariCompany = {
  companyId: string;
  name: string;
  type: "SUPPLIER" | "BUYER" | "BOTH";
  receivableBalance?: string | number;
  payableBalance?: string | number;
};

type UdhariData = {
  totals: {
    receivable: string | number;
    payable: string | number;
    companiesPending: number;
  };
  receivable: UdhariCompany[];
  payable: UdhariCompany[];
};

type CompanyInfo = {
  id: string;
  name: string;
  type: "SUPPLIER" | "BUYER" | "BOTH";
  mobile: string | null;
  address: string | null;
  gstNumber: string | null;
  payableBalance: string | number;
  receivableBalance: string | number;
};

type LedgerEntry = {
  id: string;
  companyId: string;
  type: "PURCHASE" | "SALE" | "PAYMENT_IN" | "PAYMENT_OUT";
  category: "RECEIVABLE" | "PAYABLE";
  entryDate: string;
  description: string;
  debit: string | number;
  credit: string | number;
  runningBalance: string | number;
  purchaseId?: string | null;
  saleId?: string | null;
  paymentId?: string | null;
  createdAt: string;
};

type LedgerCategoryData = {
  category: "RECEIVABLE" | "PAYABLE";
  runningBalance: string | number;
  entries: LedgerEntry[];
};

type CompanyLedgerResult = {
  company: {
    id: string;
    name: string;
    type: "SUPPLIER" | "BUYER" | "BOTH";
    receivableBalance: string | number;
    payableBalance: string | number;
  };
  receivable: LedgerCategoryData;
  payable: LedgerCategoryData;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);

export default function UdhariPage() {
  const [udhari, setUdhari] = useState<UdhariData>({
    totals: { receivable: 0, payable: 0, companiesPending: 0 },
    receivable: [],
    payable: [],
  });
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected company ledger state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [ledgerData, setLedgerData] = useState<CompanyLedgerResult | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [ledgerCategoryTab, setLedgerCategoryTab] = useState<"RECEIVABLE" | "PAYABLE">("RECEIVABLE");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [udhariRes, companiesRes] = await Promise.all([
        fetch("/api/udhari"),
        fetch("/api/companies"),
      ]);

      if (!udhariRes.ok) {
        throw new Error(`Failed to load udhari data (status ${udhariRes.status})`);
      }
      if (!companiesRes.ok) {
        throw new Error(`Failed to load companies (status ${companiesRes.status})`);
      }

      const [udhariJson, companiesJson] = await Promise.all([
        udhariRes.json(),
        companiesRes.json(),
      ]);

      setUdhari(udhariJson);
      setCompanies(companiesJson);

      // Default select the first company with outstanding if none selected yet
      if (!selectedCompanyId) {
        if (udhariJson.receivable.length > 0) {
          setSelectedCompanyId(udhariJson.receivable[0].companyId);
          setLedgerCategoryTab("RECEIVABLE");
        } else if (udhariJson.payable.length > 0) {
          setSelectedCompanyId(udhariJson.payable[0].companyId);
          setLedgerCategoryTab("PAYABLE");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load outstanding data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

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

  // Fetch company ledger when selectedCompanyId changes
  useEffect(() => {
    if (!selectedCompanyId) {
      setTimeout(() => {
        setLedgerData(null);
      }, 0);
      return;
    }

    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) {
        setLedgerLoading(true);
        setLedgerError(null);
      }
    });

    fetch(`/api/ledger?companyId=${selectedCompanyId}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Failed to load ledger (status ${res.status})`);
        }
        return res.json();
      })
      .then((data: CompanyLedgerResult) => {
        if (isMounted) {
          setLedgerData(data);
          // Auto switch tab to the category that has balance or entries
          if (Number(data.company.receivableBalance) > 0) {
            setLedgerCategoryTab("RECEIVABLE");
          } else if (Number(data.company.payableBalance) > 0) {
            setLedgerCategoryTab("PAYABLE");
          }
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load account ledger";
          setLedgerError(msg);
        }
      })
      .finally(() => {
        if (isMounted) setLedgerLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCompanyId]);

  // Find company metadata by id
  const getCompanyMeta = (id: string) => companies.find((c) => c.id === id);

  // Format Buyer Rows
  const buyerRows: FeatureRow[] = udhari.receivable.map((b) => {
    const meta = getCompanyMeta(b.companyId);
    const mobileText = meta?.mobile ? ` · Mobile: ${meta.mobile}` : "";
    const balance = Number(b.receivableBalance) || 0;

    return {
      id: b.companyId,
      title: b.name,
      subtitle: `Buyer${mobileText} · Click below to inspect statement`,
      amount: formatCurrency(balance),
      status: "Money to Receive",
      tone: "green" as const,
    };
  });

  // Format Supplier Rows
  const supplierRows: FeatureRow[] = udhari.payable.map((s) => {
    const meta = getCompanyMeta(s.companyId);
    const mobileText = meta?.mobile ? ` · Mobile: ${meta.mobile}` : "";
    const balance = Number(s.payableBalance) || 0;

    return {
      id: s.companyId,
      title: s.name,
      subtitle: `Supplier${mobileText} · Click below to inspect statement`,
      amount: formatCurrency(balance),
      status: "Money to Pay",
      tone: "amber" as const,
    };
  });

  const numReceivable = Number(udhari.totals.receivable) || 0;
  const numPayable = Number(udhari.totals.payable) || 0;
  const netPosition = numReceivable - numPayable;

  const currentCompanyMeta = selectedCompanyId ? getCompanyMeta(selectedCompanyId) : null;
  const activeEntries =
    ledgerData && ledgerCategoryTab === "RECEIVABLE"
      ? ledgerData.receivable.entries
      : ledgerData && ledgerCategoryTab === "PAYABLE"
        ? ledgerData.payable.entries
        : [];

  const currentCategoryBalance =
    ledgerData && ledgerCategoryTab === "RECEIVABLE"
      ? Number(ledgerData.receivable.runningBalance) || 0
      : ledgerData && ledgerCategoryTab === "PAYABLE"
        ? Number(ledgerData.payable.runningBalance) || 0
        : 0;

  return (
    <FeaturePage
      active="/udhari"
      eyebrow="OUTSTANDING MONEY"
      title="Udhari / Outstanding"
      description="See who has to pay you, who you have to pay, and follow up without losing track."
      actionLabel="Record payment"
      actionHref="/payments#form"
    >
      <SummaryCards
        cards={[
          {
            label: "Money to receive",
            value: formatCurrency(numReceivable),
            note: `${udhari.receivable.length} buyer accounts pending`,
            tone: "green",
          },
          {
            label: "Money to pay",
            value: formatCurrency(numPayable),
            note: `${udhari.payable.length} supplier accounts pending`,
            tone: "amber",
          },
          {
            label: "Net position",
            value: `${netPosition >= 0 ? "+" : ""}${formatCurrency(netPosition)}`,
            note:
              netPosition >= 0
                ? "Net positive cash flow"
                : "Net payable position",
            tone: netPosition >= 0 ? "blue" : "red",
          },
          {
            label: "Companies pending",
            value: String(udhari.totals.companiesPending),
            note:
              udhari.totals.companiesPending > 0
                ? "Active follow-ups needed"
                : "All accounts cleared",
            tone: udhari.totals.companiesPending > 0 ? "red" : "green",
          },
        ]}
      />

      {/* Buyer Outstanding Panel */}
      <DataPanel
        title="Money to receive from buyers"
        subtitle="Follow up on sales where full payment is pending"
        rows={buyerRows}
        loading={loading}
        error={error}
        emptyText={
          loading
            ? "Loading buyer outstandings..."
            : "No buyer outstanding amounts yet. All customer bills are fully collected."
        }
      />

      {/* Supplier Outstanding Panel */}
      <DataPanel
        title="Money to pay suppliers"
        subtitle="Payments still pending for purchased scrap"
        rows={supplierRows}
        loading={loading}
        error={error}
        emptyText={
          loading
            ? "Loading supplier outstandings..."
            : "No supplier payable amounts yet. All supplier bills are fully cleared."
        }
      />

      {/* Detailed Ledger Statement Panel */}
      <section className={styles.panel} id="ledger-viewer" style={{ marginTop: "24px" }}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Detailed company ledger statement</h2>
            <p>
              Inspect every transaction, debit, credit, and running balance for any customer or supplier.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", width: "100%" }}>
            <label style={{ fontSize: "12px", color: "#566d66", fontWeight: 600 }}>
              Select company:
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              style={{
                flex: "1 1 220px",
                minHeight: "44px",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #dfe8e4",
                fontSize: "12px",
                background: "#fff",
                fontWeight: 600,
                color: "#163a35",
                outline: "none",
              }}
            >
              <option value="">-- Select a company --</option>
              {companies.map((c) => {
                const rec = Number(c.receivableBalance) || 0;
                const pay = Number(c.payableBalance) || 0;
                const statusTag =
                  rec > 0
                    ? ` (Due: ${formatCurrency(rec)})`
                    : pay > 0
                      ? ` (Owed: ${formatCurrency(pay)})`
                      : " (Clear)";
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.type}{statusTag}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {ledgerLoading && (
          <p className={styles.empty} style={{ padding: "30px 0" }}>
            Loading ledger entries...
          </p>
        )}

        {ledgerError && (
          <p className={styles.errorMessage} style={{ margin: "14px 0" }}>
            {ledgerError}
          </p>
        )}

        {!ledgerLoading && !ledgerError && ledgerData && (
          <div style={{ marginTop: "16px" }}>
            {/* Company Info Banner */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "16px 20px",
                background: "#fafcfb",
                border: "1px solid #e8efec",
                borderRadius: "8px",
                marginBottom: "16px",
              }}
            >
              <div>
                <strong style={{ fontSize: "16px", color: "#163a35", display: "block" }}>
                  {ledgerData.company.name}
                </strong>
                <small style={{ color: "#788984", fontSize: "11px" }}>
                  Type: {ledgerData.company.type}
                  {currentCompanyMeta?.mobile ? ` · Mobile: ${currentCompanyMeta.mobile}` : ""}
                  {currentCompanyMeta?.gstNumber ? ` · GSTIN: ${currentCompanyMeta.gstNumber}` : ""}
                </small>
              </div>

              <div style={{ display: "flex", gap: "18px", alignItems: "center" }}>
                <div style={{ textAlign: "right" }}>
                  <small style={{ display: "block", fontSize: "10px", color: "#788984", textTransform: "uppercase", fontWeight: 700 }}>
                    {ledgerCategoryTab === "RECEIVABLE" ? "Receivable Balance" : "Payable Balance"}
                  </small>
                  <strong
                    style={{
                      fontSize: "20px",
                      color: ledgerCategoryTab === "RECEIVABLE" ? "#39816b" : "#ae762b",
                    }}
                  >
                    {formatCurrency(currentCategoryBalance)}
                  </strong>
                </div>

                <a
                  href="/payments#form"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 14px",
                    minHeight: "44px",
                    background: "#d4ec7c",
                    color: "#173b35",
                    fontSize: "12px",
                    fontWeight: 700,
                    borderRadius: "6px",
                    textDecoration: "none",
                  }}
                >
                  ⚡ Settle Payment
                </a>
              </div>
            </div>

            {/* Category Tabs (Receivable vs Payable) */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setLedgerCategoryTab("RECEIVABLE")}
                style={{
                  flex: "1 1 260px",
                  minHeight: "44px",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: ledgerCategoryTab === "RECEIVABLE" ? "2px solid #39816b" : "1px solid #dfe8e4",
                  background: ledgerCategoryTab === "RECEIVABLE" ? "#edf8f3" : "#fff",
                  color: ledgerCategoryTab === "RECEIVABLE" ? "#24604e" : "#536763",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                Customer Receivable (Sales & Receipts) · {ledgerData.receivable.entries.length} records
              </button>

              <button
                type="button"
                onClick={() => setLedgerCategoryTab("PAYABLE")}
                style={{
                  flex: "1 1 260px",
                  minHeight: "44px",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: ledgerCategoryTab === "PAYABLE" ? "2px solid #ae762b" : "1px solid #dfe8e4",
                  background: ledgerCategoryTab === "PAYABLE" ? "#fbf5ec" : "#fff",
                  color: ledgerCategoryTab === "PAYABLE" ? "#8c5614" : "#536763",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                Supplier Payable (Purchases & Payouts) · {ledgerData.payable.entries.length} records
              </button>
            </div>

            {/* Itemized Ledger Table */}
            {activeEntries.length === 0 ? (
              <p className={styles.empty}>
                No {ledgerCategoryTab.toLowerCase()} transactions recorded for this company.
              </p>
            ) : (
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table
                  style={{
                    width: "100%",
                    minWidth: "600px",
                    borderCollapse: "collapse",
                    fontSize: "12px",
                    color: "#385850",
                    marginTop: "8px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "2px solid #edf1f0",
                        textAlign: "left",
                        color: "#788984",
                        fontSize: "11px",
                        textTransform: "uppercase",
                      }}
                    >
                      <th style={{ padding: "10px 12px" }}>Date</th>
                      <th style={{ padding: "10px 12px" }}>Type</th>
                      <th style={{ padding: "10px 12px" }}>Description</th>
                      <th style={{ padding: "10px 12px", textAlign: "right" }}>Debit (+)</th>
                      <th style={{ padding: "10px 12px", textAlign: "right" }}>Credit (-)</th>
                      <th style={{ padding: "10px 12px", textAlign: "right" }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeEntries.map((entry) => {
                      const dateStr = new Date(entry.entryDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });
                      const isPayment = entry.type === "PAYMENT_IN" || entry.type === "PAYMENT_OUT";
                      const debitNum = Number(entry.debit) || 0;
                      const creditNum = Number(entry.credit) || 0;
                      const runningNum = Number(entry.runningBalance) || 0;

                      return (
                        <tr
                          key={entry.id}
                          style={{
                            borderBottom: "1px solid #edf1f0",
                            background: isPayment ? "#fdfefe" : "#fff",
                          }}
                        >
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{dateStr}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: "12px",
                                fontSize: "10px",
                                fontWeight: 600,
                                background:
                                  entry.type === "SALE"
                                    ? "#eef5fc"
                                    : entry.type === "PURCHASE"
                                      ? "#fdf8ee"
                                      : "#edf8f3",
                                color:
                                  entry.type === "SALE"
                                    ? "#315e83"
                                    : entry.type === "PURCHASE"
                                      ? "#8a5813"
                                      : "#286854",
                              }}
                            >
                              {entry.type}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <strong>{entry.description}</strong>
                            {entry.purchaseId && (
                              <small style={{ display: "block", color: "#8b9b95", fontSize: "10px" }}>
                                Bill Ref: #{entry.purchaseId.slice(0, 8)}
                              </small>
                            )}
                            {entry.saleId && (
                              <small style={{ display: "block", color: "#8b9b95", fontSize: "10px" }}>
                                Invoice Ref: #{entry.saleId.slice(0, 8)}
                              </small>
                            )}
                            {entry.paymentId && (
                              <small style={{ display: "block", color: "#8b9b95", fontSize: "10px" }}>
                                Payment Ref: #{entry.paymentId.slice(0, 8)}
                              </small>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              textAlign: "right",
                              fontWeight: debitNum > 0 ? 600 : 400,
                              color: debitNum > 0 ? "#1b4a40" : "#9aa7a3",
                            }}
                          >
                            {debitNum > 0 ? formatCurrency(debitNum) : "—"}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              textAlign: "right",
                              fontWeight: creditNum > 0 ? 600 : 400,
                              color: creditNum > 0 ? "#39816b" : "#9aa7a3",
                            }}
                          >
                            {creditNum > 0 ? formatCurrency(creditNum) : "—"}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              textAlign: "right",
                              fontWeight: 700,
                              color: runningNum > 0 ? "#ae762b" : "#39816b",
                            }}
                          >
                            {formatCurrency(runningNum)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!selectedCompanyId && !ledgerLoading && (
          <p className={styles.empty}>
            Select a company from the dropdown above to view its statement.
          </p>
        )}
      </section>
    </FeaturePage>
  );
}

