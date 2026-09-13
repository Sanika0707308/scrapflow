"use client";

import { useCallback, useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import { FeaturePage } from "@/components/FeaturePage";
import styles from "@/components/FeaturePage.module.css";
import { readBusinessProfile } from "@/lib/business-profile";
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
  billType: string;
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
  const [billType, setBillType] = useState<"Sale / bill to buyer" | "Purchase / bill from supplier">("Sale / bill to buyer");
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
  const handleBillTypeChange = (newType: "Sale / bill to buyer" | "Purchase / bill from supplier") => {
    setBillType(newType);
    setCompanyId("");
    setCompanyName("");
    setMobile("");
    setFormError(null);
    setSavedMessage("");
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

  // WhatsApp Message Generator
  const formattedQty = formatQuantity(enteredQtyKg);
  const whatsappMessage = `Hello ${companyName || "Sir/Madam"}, your ${billType.toLowerCase()} from ${businessName} (Bill #${billNumber}) is ${formattedQty} of ${scrapItemName || "Scrap"} at ${money.format(numRate)} per ${unit}. Total: ${money.format(total)}. ${isSale ? "Paid now" : "Paid to you"}: ${money.format(numPaid)}. Remaining: ${money.format(remaining)}. Contact: ${ownerName}.`;
  const whatsappLink = `https://web.whatsapp.com/send?phone=${mobile.replace(/\D/g, "")}&text=${encodeURIComponent(whatsappMessage)}`;

  // PDF Generator (Thermal receipt 80mm format)
  const createPdf = () => {
    const pdf = new jsPDF({ unit: "mm", format: [80, 180] });
    const pdfMoney = (amount: number) =>
      `Rs. ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const center = (
      text: string,
      y: number,
      size: number,
      color: [number, number, number] = [35, 70, 62],
    ) => {
      pdf.setFontSize(size);
      pdf.setTextColor(...color);
      pdf.text(text, 40, y, { align: "center" });
    };
    const line = (y: number) => {
      pdf.setDrawColor(195, 210, 203);
      pdf.line(5, y, 75, y);
    };
    const right = (text: string, y: number, size = 9) => {
      pdf.setFontSize(size);
      pdf.setTextColor(45, 78, 68);
      pdf.text(text, 75, y, { align: "right" });
    };
    const left = (text: string, y: number, size = 9) => {
      pdf.setFontSize(size);
      pdf.setTextColor(45, 78, 68);
      pdf.text(text, 5, y);
    };

    center(businessName, 13, 15, [27, 74, 64]);
    center("SCRAP TRADING BILL", 19, 8, [90, 110, 102]);
    center(`Prepared by ${ownerName}`, 25, 8, [90, 110, 102]);
    line(30);

    left(`Bill no: ${billNumber}`, 37, 8);
    right(`Date: ${billDate}`, 37, 8);
    left(isSale ? "BILL TO (BUYER)" : "BILL FROM (SUPPLIER)", 46, 7);

    const partyLines = pdf.splitTextToSize(companyName || "Valued Party", 68) as string[];
    pdf.setFontSize(10);
    pdf.setTextColor(27, 74, 64);
    pdf.text(partyLines, 5, 52);

    const partyEnd = 52 + (partyLines.length - 1) * 4;
    line(partyEnd + 6);
    const tableY = partyEnd + 14;

    left("ITEM", tableY, 7);
    right("AMOUNT", tableY, 7);
    line(tableY + 3);

    const itemLines = pdf.splitTextToSize(`${scrapItemName} (${isSale ? "Sale" : "Purchase"})`, 47) as string[];
    pdf.setFontSize(9);
    pdf.setTextColor(45, 78, 68);
    pdf.text(itemLines, 5, tableY + 10);

    const itemEnd = tableY + 10 + (itemLines.length - 1) * 4;
    right(pdfMoney(total), itemEnd, 9);
    left(`${formattedQty} x ${pdfMoney(numRate)} / ${unit}`, itemEnd + 6, 8);
    line(itemEnd + 11);

    left("Bill total", itemEnd + 19, 9);
    right(pdfMoney(total), itemEnd + 19, 9);
    left(isSale ? "Paid now" : "Paid to supplier", itemEnd + 27, 9);
    right(pdfMoney(numPaid), itemEnd + 27, 9);
    left("BALANCE / UDHARI", itemEnd + 36, 9);
    right(pdfMoney(remaining), itemEnd + 36, 10);
    line(itemEnd + 42);

    center("Thank you for your business", itemEnd + 51, 8, [90, 110, 102]);
    center("Generated by ScrapFlow", itemEnd + 57, 7, [125, 140, 132]);
    return pdf;
  };

  const downloadPdf = () => {
    if (!companyName || total <= 0) {
      setFormError("Please select a company and enter a quantity and rate greater than zero.");
      return;
    }
    const pdf = createPdf();
    pdf.save(`scrapflow-bill-${companyName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
    setSavedMessage("Bill PDF downloaded successfully.");
  };

  const sendOnWhatsApp = async () => {
    if (!companyName || total <= 0) {
      setFormError("Please select a company and enter a quantity and rate greater than zero.");
      return;
    }
    const pdf = createPdf();
    const file = new File([pdf.output("blob")], `scrapflow-bill-${billNumber}.pdf`, {
      type: "application/pdf",
    });
    const shareMessage = `${whatsappMessage} Please find the bill attached.`;

    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try {
        await navigator.share({ title: `Bill ${billNumber}`, text: shareMessage, files: [file] });
        setSavedMessage("Bill shared successfully.");
        return;
      } catch {
        /* User may cancel share sheet */
      }
    }

    pdf.save(`scrapflow-bill-${companyName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
    window.open(whatsappLink, "_blank", "noopener,noreferrer");
    setSavedMessage("PDF downloaded. WhatsApp Web opened; attach the downloaded PDF in the chat.");
  };

  // Save Quick Bill to PostgreSQL via existing /api/sales or /api/purchases
  const saveBill = async () => {
    setFormError(null);
    setSavedMessage("");

    if (!companyId) {
      setFormError("Please select a company.");
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
      setFormError("Payment received cannot exceed the total bill amount.");
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
          throw new Error(body.error || `Failed to save quick bill (status ${res.status})`);
        }
      } else {
        // Record as purchase in backend
        const payload = {
          supplierId: companyId,
          purchaseDate: new Date(billDate).toISOString(),
          notes: `Quick bill #${billNumber}`,
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
          throw new Error(body.error || `Failed to save quick bill (status ${res.status})`);
        }
      }

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
      };

      setRecentBills((prev) => [newSavedBill, ...prev]);
      setSavedMessage(
        `Bill #${billNumber} saved successfully to the database! Inventory stock and ${isSale ? "buyer receivable" : "supplier payable"} updated.`,
      );
      setShowPreview(true);

      // Refresh live reference data (stock & balances)
      await loadData();

      // Generate a new bill number for subsequent bills
      setBillNumber(`SF-${String(Date.now()).slice(-6)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save quick bill";
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
            Bill type
            <select
              value={billType}
              onChange={(e) =>
                handleBillTypeChange(
                  e.target.value as "Sale / bill to buyer" | "Purchase / bill from supplier",
                )
              }
            >
              <option value="Sale / bill to buyer">Sale / bill to buyer</option>
              <option value="Purchase / bill from supplier">Purchase / bill from supplier</option>
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
            Bill date *
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

        <div className={styles.billTotal}>
          <span>Total bill amount</span>
          <strong>{money.format(total)}</strong>
          <small>
            {billType} · {isSale ? "Received" : "Paid"}: {money.format(numPaid)} · Remaining: {money.format(remaining)} tracked in Udhari
          </small>
        </div>

        <div className={styles.billActions}>
          <button
            className={styles.saveButton}
            type="button"
            disabled={loading || isSubmitting || !companyId || !scrapTypeId || total <= 0 || isExceedingStock}
            onClick={saveBill}
          >
            {isSubmitting ? "Saving to database..." : "Save quick bill"}
          </button>
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
        </div>

        {savedMessage && <p className={styles.successMessage}>{savedMessage}</p>}
        {formError && <p className={styles.errorMessage}>{formError}</p>}
      </section>

      {/* Interactive Bill Receipt Preview */}
      {showPreview && (
        <section className={styles.billPreview}>
          <div className={styles.billPreviewHeader}>
            <div>
              <p className={styles.eyebrow}>RECEIPT PREVIEW · {billNumber}</p>
              <h2>{businessName}</h2>
              <small>
                Prepared by {ownerName} · {isSale ? "Bill To" : "Bill From"} {companyName || "Valued Customer"} · {billDate}
              </small>
            </div>
            <strong>{money.format(total)}</strong>
          </div>
          <div className={styles.previewLine}>
            <span>
              {scrapItemName || "Scrap item"} · {billType}
            </span>
            <span>
              {formattedQty} × {money.format(numRate)} / {unit}
            </span>
          </div>
          <div className={styles.previewLine}>
            <span>{isSale ? "Paid now" : "Paid to supplier"}</span>
            <strong>{money.format(numPaid)}</strong>
          </div>
          <div className={styles.previewLine}>
            <span>Remaining udhari / balance</span>
            <strong>{money.format(remaining)}</strong>
          </div>
          <p className={styles.previewNote}>
            This bill can be downloaded as a thermal receipt PDF or shared directly with {companyName || "the party"} on WhatsApp Web.
          </p>
        </section>
      )}

      {/* Recent Quick Bills Session Log */}
      {recentBills.length > 0 && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Recent quick bills in this session</h2>
              <p>Bills saved directly to PostgreSQL database.</p>
            </div>
          </div>
          <div className={styles.dataList}>
            {recentBills.map((b) => (
              <div className={styles.dataRow} key={b.id}>
                <div>
                  <strong>
                    {b.billNumber} · {b.companyName}
                  </strong>
                  <small>
                    {b.billType} · {formatQuantity(isTonneUnit(b.unit) ? b.quantity * 1000 : b.quantity)} of {b.scrapName} @ {money.format(b.rate)} / {b.unit} · {b.billDate}
                  </small>
                </div>
                <strong>{money.format(b.total)}</strong>
                <span
                  className={`${styles.status} ${
                    b.remaining === 0 ? styles.green : styles.amber
                  }`}
                >
                  {b.remaining === 0 ? "Settled" : `Due: ${money.format(b.remaining)}`}
                </span>
              </div>
            ))}
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
            <small>Reduces available yard inventory and records buyer receivable in the database.</small>
          </div>
          <div>
            <strong>Purchase / bill from supplier</strong>
            <small>Increases available yard inventory and records supplier payable in the database.</small>
          </div>
        </div>
      </section>
    </FeaturePage>
  );
}

