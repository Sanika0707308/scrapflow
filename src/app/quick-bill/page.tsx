"use client";

import { useCallback, useEffect, useState } from "react";
import { FeaturePage } from "@/components/FeaturePage";
import styles from "@/components/FeaturePage.module.css";
import { BuyerBillModal } from "@/components/BuyerBillModal";
import { readBusinessProfile } from "@/lib/business-profile";
import {
  type BuyerBillData,
  downloadBuyerBillPdf,
  generateBuyerBillPdf,
  getBuyerBillWhatsAppMessage,
} from "@/lib/buyer-bill";
import { formatQuantity, isTonneUnit } from "@/lib/quantity";

type Company = {
  id: string;
  name: string;
  type: "SUPPLIER" | "BUYER" | "BOTH";
  mobile: string | null;
  payableBalance: string | number;
  receivableBalance: string | number;
};

type ScrapType = {
  id: string;
  name: string;
  unit: string;
  currentStock: string | number;
};

type SavedQuickBill = {
  id: string;
  billNumber: string;
  billType: "Sale / bill to buyer" | "Purchase / inward from supplier";
  companyName: string;
  mobile: string;
  scrapName: string;
  unit: string;
  quantity: number;
  rate: number;
  total: number;
  paymentReceived: number;
  remaining: number;
  billDate: string;
  createdAt: string;
  buyerBillData?: BuyerBillData;
};

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export default function QuickBillPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [scrapTypes, setScrapTypes] = useState<ScrapType[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Form State
  const [billType, setBillType] = useState<"Sale / bill to buyer" | "Purchase / inward from supplier">("Sale / bill to buyer");
  const [selectedBillForModal, setSelectedBillForModal] = useState<BuyerBillData | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [mobile, setMobile] = useState("");
  const [scrapTypeId, setScrapTypeId] = useState("");
  const [scrapItemName, setScrapItemName] = useState("");
  const [unit, setUnit] = useState("Tonne (MT)");
  const [quantity, setQuantity] = useState("1");
  const [rate, setRate] = useState("40000");
  const [paymentReceived, setPaymentReceived] = useState("0");
  const [billDate, setBillDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [billNumber, setBillNumber] = useState(() => `SF-${String(Date.now()).slice(-6)}`);

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentBills, setRecentBills] = useState<SavedQuickBill[]>([]);

  // Business Profile
  const [businessName, setBusinessName] = useState("Your business name");
  const [ownerName, setOwnerName] = useState("Business owner");

  // Load business profile from local settings
  useEffect(() => {
    const details = readBusinessProfile();
    if (details) {
      setTimeout(() => {
        setBusinessName(details.businessName || "Your business name");
        setOwnerName(details.ownerName || "Business owner");
      }, 0);
    }
  }, []);

  // Fetch real companies and scrap types from backend APIs
  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [compRes, scrapRes] = await Promise.all([
        fetch("/api/companies"),
        fetch("/api/scrap-types"),
      ]);

      if (!compRes.ok) throw new Error("Failed to load companies");
      if (!scrapRes.ok) throw new Error("Failed to load scrap types");

      const compData: Company[] = await compRes.json();
      const scrapData: ScrapType[] = await scrapRes.json();

      setCompanies(compData);
      setScrapTypes(scrapData);

      // Default scrap selection if not set
      if (!scrapTypeId && scrapData.length > 0) {
        const first = scrapData[0];
        setScrapTypeId(first.id);
        setScrapItemName(first.name);
        setUnit(first.unit || "Tonne (MT)");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load quick bill reference data";
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }, [scrapTypeId]);

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

  // Filter companies based on billType
  const isSale = billType === "Sale / bill to buyer";
  const eligibleCompanies = companies.filter((c) => {
    if (isSale) {
      return c.type === "BUYER" || c.type === "BOTH";
    } else {
      return c.type === "SUPPLIER" || c.type === "BOTH";
    }
  });

  // Handle Bill Type change
  const handleBillTypeChange = (newType: "Sale / bill to buyer" | "Purchase / inward from supplier") => {
    setBillType(newType);
    setCompanyId("");
    setCompanyName("");
    setMobile("");
    setFormError(null);
    setSavedMessage("");
    setShowPreview(false);
  };

  // Handle Company Selection
  const handleCompanyChange = (selectedId: string) => {
    setCompanyId(selectedId);
    const selected = companies.find((c) => c.id === selectedId);
    if (selected) {
      setCompanyName(selected.name);
      setMobile(selected.mobile || "");
    } else {
      setCompanyName("");
      setMobile("");
    }
  };

  // Handle Scrap Type Selection
  const handleScrapChange = (selectedId: string) => {
    setScrapTypeId(selectedId);
    const selected = scrapTypes.find((s) => s.id === selectedId);
    if (selected) {
      setScrapItemName(selected.name);
      setUnit(selected.unit);
    }
  };

  const selectedScrapType = scrapTypes.find((s) => s.id === scrapTypeId);
  const availableStockKg = selectedScrapType ? Number(selectedScrapType.currentStock) || 0 : 0;
  const numQuantity = Number(quantity) || 0;
  const numRate = Number(rate) || 0;
  const total = numQuantity * numRate;
  const numPaid = Number(paymentReceived) || 0;
  const remaining = Math.max(total - numPaid, 0);
  const enteredQtyKg = isTonneUnit(unit) ? numQuantity * 1000 : numQuantity;
  const isExceedingStock = isSale && selectedScrapType ? enteredQtyKg > availableStockKg : false;

  const formattedQty = formatQuantity(enteredQtyKg);

  // Live BuyerBillData object for sales
  const currentBuyerBill: BuyerBillData = {
    billNumber,
    date: billDate,
    buyer: {
      id: companyId,
      name: companyName || "Valued Buyer",
      mobile: mobile || null,
    },
    items: [
      {
        name: scrapItemName || "Scrap Material",
        quantityKg: enteredQtyKg,
        unit,
        rate: numRate,
        amount: total,
      },
    ],
    totalAmount: total,
    amountPaid: numPaid,
    outstandingAmount: remaining,
    status: remaining === 0 ? "PAID" : numPaid > 0 ? "PARTIAL" : "UNPAID",
    notes: `Quick bill #${billNumber}`,
  };

  const downloadPdf = () => {
    if (!isSale) {
      setFormError("Bills/invoices are only generated for sales to buyers. Inward purchases are recorded without bills.");
      return;
    }
    if (!companyName || total <= 0) {
      setFormError("Please select a buyer and enter a quantity and rate greater than zero.");
      return;
    }
    downloadBuyerBillPdf(currentBuyerBill, { businessName, ownerName });
    setSavedMessage("Buyer bill PDF downloaded successfully.");
  };

  const sendOnWhatsApp = async () => {
    if (!isSale) {
      setFormError("Bills/invoices are only generated for sales to buyers.");
      return;
    }
    if (!companyName || total <= 0) {
      setFormError("Please select a buyer and enter a quantity and rate greater than zero.");
      return;
    }
    const message = getBuyerBillWhatsAppMessage(currentBuyerBill, { businessName, ownerName });
    const targetPhone = mobile.replace(/\D/g, "");
    const waUrl = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        const pdf = generateBuyerBillPdf(currentBuyerBill, { businessName, ownerName });
        const file = new File([pdf.output("blob")], `scrapflow-bill-${billNumber}.pdf`, {
          type: "application/pdf",
        });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({ title: `Bill ${billNumber}`, text: message, files: [file] });
          setSavedMessage("Buyer bill shared successfully.");
          return;
        }
      } catch {
        /* User may cancel share sheet */
      }
    }

    downloadBuyerBillPdf(currentBuyerBill, { businessName, ownerName });
    window.open(waUrl, "_blank", "noopener,noreferrer");
    setSavedMessage("PDF downloaded. WhatsApp Web opened; attach the downloaded PDF in the chat.");
  };

  // Save Quick Transaction to PostgreSQL via /api/sales or /api/purchases
  const saveBill = async () => {
    setFormError(null);
    setSavedMessage("");

    if (!companyId) {
      setFormError(isSale ? "Please select a buyer." : "Please select a supplier.");
      return;
    }
    if (!scrapTypeId) {
      setFormError("Please select a scrap item.");
      return;
    }
    if (numQuantity <= 0) {
      setFormError("Quantity must be greater than zero.");
      return;
    }
    if (numRate <= 0) {
      setFormError("Rate must be greater than zero.");
      return;
    }
    if (numPaid < 0) {
      setFormError("Payment amount cannot be negative.");
      return;
    }
    if (numPaid > total) {
      setFormError("Payment received cannot exceed the total amount.");
      return;
    }
    if (isSale && enteredQtyKg > availableStockKg) {
      setFormError(
        `Sale quantity (${formatQuantity(enteredQtyKg)}) exceeds available inventory stock (${formatQuantity(availableStockKg)}).`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSale) {
        // Record as sale in backend
        const payload = {
          buyerId: companyId,
          saleDate: new Date(billDate).toISOString(),
          notes: `Quick bill #${billNumber}`,
          amountReceived: numPaid,
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
          throw new Error(body.error || `Failed to save sale bill (status ${res.status})`);
        }

        const buyerBillToSave: BuyerBillData = {
          billNumber,
          date: billDate,
          buyer: {
            id: companyId,
            name: companyName,
            mobile: mobile || null,
          },
          items: [
            {
              name: scrapItemName,
              quantityKg: enteredQtyKg,
              unit,
              rate: numRate,
              amount: total,
            },
          ],
          totalAmount: total,
          amountPaid: numPaid,
          outstandingAmount: remaining,
          status: remaining === 0 ? "PAID" : numPaid > 0 ? "PARTIAL" : "UNPAID",
          notes: `Quick bill #${billNumber}`,
        };

        const newSavedBill: SavedQuickBill = {
          id: billNumber,
          billNumber,
          billType,
          companyName,
          mobile,
          scrapName: scrapItemName,
          unit,
          quantity: numQuantity,
          rate: numRate,
          total,
          paymentReceived: numPaid,
          remaining,
          billDate,
          createdAt: new Date().toISOString(),
          buyerBillData: buyerBillToSave,
        };

        setRecentBills((prev) => [newSavedBill, ...prev]);
        setSavedMessage(
          `Sale recorded and Bill #${billNumber} generated successfully! Inventory stock and buyer receivable updated.`,
        );
        setSelectedBillForModal(buyerBillToSave);
      } else {
        // Record as purchase in backend (NO INVOICE/BILL FOR SUPPLIER)
        const payload = {
          supplierId: companyId,
          purchaseDate: new Date(billDate).toISOString(),
          notes: `Inward counter purchase`,
          amountPaid: numPaid,
          items: [
            {
              scrapTypeId,
              quantity: numQuantity,
              rate: numRate,
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
          throw new Error(body.error || `Failed to record inward purchase (status ${res.status})`);
        }

        const newSavedBill: SavedQuickBill = {
          id: `PUR-${Date.now()}`,
          billNumber: "No Bill",
          billType,
          companyName,
          mobile,
          scrapName: scrapItemName,
          unit,
          quantity: numQuantity,
          rate: numRate,
          total,
          paymentReceived: numPaid,
          remaining,
          billDate,
          createdAt: new Date().toISOString(),
        };

        setRecentBills((prev) => [newSavedBill, ...prev]);
        setSavedMessage(
          `Purchase recorded successfully! Added to yard inventory and supplier payable ledger. (No bill generated for supplier)`,
        );
        setShowPreview(false);
      }

      // Refresh live reference data (stock & balances)
      await loadData();

      // Generate a new bill number for subsequent bills
      setBillNumber(`SF-${String(Date.now()).slice(-6)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save transaction";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeaturePage
      active="/quick-bill"
      eyebrow="FAST ENTRY"
      title="Quick bill"
      description="Make a small bill directly for a company without opening the full purchase or sale register."
    >
      <section className={styles.panel} id="quick-bill-form">
        <div className={styles.panelHeader}>
          <div>
            <h2>Make a quick bill</h2>
            <p>
              Use this for a fast counter transaction. Stock and ledger outstandings are updated automatically in PostgreSQL.
            </p>
          </div>
          <span className={`${styles.status} ${styles.blue}`}>Live database linked</span>
        </div>

        {apiError && (
          <p className={styles.errorMessage} style={{ margin: "14px 0" }}>
            {apiError}
          </p>
        )}

        <div className={styles.formGrid}>
          <label>
            Transaction / Bill type
            <select
              value={billType}
              onChange={(e) =>
                handleBillTypeChange(
                  e.target.value as "Sale / bill to buyer" | "Purchase / inward from supplier",
                )
              }
            >
              <option value="Sale / bill to buyer">Sale / bill to buyer (Bill generated)</option>
              <option value="Purchase / inward from supplier">Purchase / inward from supplier (No bill)</option>
            </select>
          </label>

          <label>
            Company *
            <select
              value={companyId}
              onChange={(e) => handleCompanyChange(e.target.value)}
              required
            >
              <option value="">
                {isSale ? "-- Select a buyer --" : "-- Select a supplier --"}
              </option>
              {eligibleCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === "BOTH" ? "Buyer & Supplier" : c.type})
                </option>
              ))}
            </select>
          </label>

          <label>
            Company WhatsApp number
            <input
              value={mobile}
              onChange={(event) => setMobile(event.target.value)}
              placeholder="e.g. 9876543210"
            />
          </label>

          <label>
            Date *
            <input
              type="date"
              value={billDate}
              onChange={(event) => setBillDate(event.target.value)}
              required
            />
          </label>

          <label>
            Scrap item *
            <select
              value={scrapTypeId}
              onChange={(e) => handleScrapChange(e.target.value)}
              required
            >
              <option value="">-- Select scrap material --</option>
              {scrapTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · Yard Stock: {formatQuantity(t.currentStock)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Measurement unit
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
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
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
            {isSale && selectedScrapType && (
              <small
                style={{
                  color: isExceedingStock ? "#b45e4d" : "#567065",
                  fontWeight: isExceedingStock ? 700 : 400,
                }}
              >
                {isExceedingStock
                  ? `⚠️ Exceeds yard stock (${formatQuantity(availableStockKg)})`
                  : `In yard: ${formatQuantity(availableStockKg)}`}
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
              onChange={(event) => setRate(event.target.value)}
              required
            />
          </label>

          <label>
            {isSale ? "Payment received now (₹)" : "Payment paid now (₹)"}
            <input
              type="number"
              step="any"
              min="0"
              value={paymentReceived}
              onChange={(event) => setPaymentReceived(event.target.value)}
            />
          </label>

          <label>
            Payment status
            <select
              value={
                remaining === 0
                  ? "Fully paid"
                  : numPaid > 0
                    ? "Part payment / udhari"
                    : "Pay later / Udhari"
              }
              disabled
              style={{ background: "#fafcfb", color: "#566d66" }}
            >
              <option>Fully paid</option>
              <option>Part payment / udhari</option>
              <option>Pay later / Udhari</option>
            </select>
          </label>
        </div>

        {!isSale && (
          <div
            style={{
              padding: "10px 14px",
              background: "#fef9ee",
              border: "1px solid #f6e3ba",
              borderRadius: "6px",
              color: "#8a5814",
              fontSize: "12px",
              marginTop: "16px",
            }}
          >
            <strong>ℹ️ Inward Purchase:</strong> Scrap bought from suppliers is recorded directly into yard inventory and supplier payable balance. In scrap trading, bills/invoices are strictly generated for sales to buyers.
          </div>
        )}

        <div className={styles.billTotal}>
          <span>{isSale ? "Total bill amount" : "Purchase cost total"}</span>
          <strong>{money.format(total)}</strong>
          <small>
            {isSale ? (
              <>Sale to buyer · Received: {money.format(numPaid)} · Remaining udhari: {money.format(remaining)}</>
            ) : (
              <>Inward purchase · Paid to supplier: {money.format(numPaid)} · Remaining payable: {money.format(remaining)}</>
            )}
          </small>
        </div>

        <div className={styles.billActions}>
          <button
            className={styles.saveButton}
            type="button"
            disabled={loading || isSubmitting || !companyId || !scrapTypeId || total <= 0 || isExceedingStock}
            onClick={saveBill}
          >
            {isSubmitting
              ? "Saving to database..."
              : isSale
                ? "Save sale & generate bill"
                : "Record purchase entry"}
          </button>
          {isSale && (
            <>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => setShowPreview((current) => !current)}
              >
                {showPreview ? "Hide bill preview" : "View bill preview"}
              </button>
              <button className={styles.pdfButton} type="button" onClick={downloadPdf}>
                Download PDF
              </button>
              <button className={styles.whatsappButton} type="button" onClick={sendOnWhatsApp}>
                Send bill on WhatsApp
              </button>
            </>
          )}
        </div>

        {savedMessage && <p className={styles.successMessage}>{savedMessage}</p>}
        {formError && <p className={styles.errorMessage}>{formError}</p>}
      </section>

      {/* Interactive Buyer Bill Receipt Preview (Sales Only) */}
      {showPreview && isSale && (
        <section className={styles.billPreview}>
          <div className={styles.billPreviewHeader}>
            <div>
              <p className={styles.eyebrow}>BUYER BILL PREVIEW · {billNumber}</p>
              <h2>{businessName}</h2>
              <small>
                Prepared by {ownerName} · Bill To {companyName || "Valued Buyer"} · {billDate}
              </small>
            </div>
            <strong>{money.format(total)}</strong>
          </div>
          <div className={styles.previewLine}>
            <span>
              {scrapItemName || "Scrap item"} · Sale to buyer
            </span>
            <span>
              {formattedQty} × {money.format(numRate)} / {unit}
            </span>
          </div>
          <div className={styles.previewLine}>
            <span>Payment received now</span>
            <strong>{money.format(numPaid)}</strong>
          </div>
          <div className={styles.previewLine}>
            <span>Remaining udhari to collect</span>
            <strong>{money.format(remaining)}</strong>
          </div>
          <p className={styles.previewNote}>
            Official buyer bill will be generated and can be downloaded as a PDF, printed, or sent via WhatsApp.
          </p>
        </section>
      )}

      {/* Recent Transactions Session Log */}
      {recentBills.length > 0 && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Recent transactions in this session</h2>
              <p>Transactions saved directly to PostgreSQL database.</p>
            </div>
          </div>
          <div className={styles.dataList}>
            {recentBills.map((b) => {
              const isEntrySale = b.billType === "Sale / bill to buyer";
              return (
                <div className={styles.dataRow} key={b.id}>
                  <div>
                    <strong>
                      {isEntrySale ? `Bill #${b.billNumber} · ${b.companyName}` : `Inward Purchase · ${b.companyName}`}
                    </strong>
                    <small>
                      {isEntrySale ? "Sale to buyer (Bill generated)" : "Purchase from supplier (No bill issued)"} · {formatQuantity(isTonneUnit(b.unit) ? b.quantity * 1000 : b.quantity)} of {b.scrapName} @ {money.format(b.rate)} / {b.unit} · {b.billDate}
                    </small>
                  </div>
                  <strong>{money.format(b.total)}</strong>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      className={`${styles.status} ${
                        b.remaining === 0 ? styles.green : styles.amber
                      }`}
                    >
                      {b.remaining === 0 ? "Settled" : `Due: ${money.format(b.remaining)}`}
                    </span>
                    {isEntrySale && b.buyerBillData && (
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => setSelectedBillForModal(b.buyerBillData || null)}
                      >
                        View Bill
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>When to use Quick bill</h2>
            <p>
              For multi-item orders with vehicle and challan details, use Buy scrap or Sell scrap.
            </p>
          </div>
        </div>
        <div className={styles.helpGrid}>
          <div>
            <strong>Sale / bill to buyer</strong>
            <small>Reduces yard inventory, updates buyer receivable, and generates official printable/downloadable buyer invoice.</small>
          </div>
          <div>
            <strong>Purchase / inward from supplier</strong>
            <small>Increases yard inventory and updates supplier payable. In scrap operations, no bill/invoice is generated for suppliers.</small>
          </div>
        </div>
      </section>

      {/* Buyer Bill Modal */}
      <BuyerBillModal
        bill={selectedBillForModal}
        onClose={() => setSelectedBillForModal(null)}
      />
    </FeaturePage>
  );
}

