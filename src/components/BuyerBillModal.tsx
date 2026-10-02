"use client";

import { useEffect, useState } from "react";
import { Download, MessageCircle, Printer, X } from "lucide-react";
import styles from "./FeaturePage.module.css";
import { readBusinessProfile } from "@/lib/business-profile";
import {
  downloadBuyerBillPdf,
  formatBillCurrency,
  generateBuyerBillPdf,
  getBuyerBillWhatsAppMessage,
  printBuyerBill,
  type BuyerBillData,
} from "@/lib/buyer-bill";
import { formatQuantity } from "@/lib/quantity";

export function BuyerBillModal({
  bill,
  onClose,
}: {
  bill: BuyerBillData | null;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<ReturnType<typeof readBusinessProfile>>(null);
  const [shareFeedback, setShareFeedback] = useState("");

  useEffect(() => {
    const p = readBusinessProfile();
    if (p) {
      setTimeout(() => setProfile(p), 0);
    }
  }, []);

  if (!bill) return null;

  const handlePrint = () => {
    printBuyerBill(bill, profile);
  };

  const handleDownload = () => {
    downloadBuyerBillPdf(bill, profile);
    setShareFeedback("Invoice PDF downloaded successfully.");
    setTimeout(() => setShareFeedback(""), 4000);
  };

  const handleWhatsApp = async () => {
    const message = getBuyerBillWhatsAppMessage(bill, profile);
    const targetPhone = (bill.buyer.mobile || "").replace(/\D/g, "");
    const waUrl = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    // Try web share if on mobile
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        const pdf = generateBuyerBillPdf(bill, profile);
        const file = new File([pdf.output("blob")], `bill-${bill.billNumber}.pdf`, {
          type: "application/pdf",
        });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Bill ${bill.billNumber}`,
            text: message,
            files: [file],
          });
          setShareFeedback("Bill shared successfully.");
          return;
        }
      } catch {
        /* User cancelled or share unavailable, fallback to direct WhatsApp URL */
      }
    }

    // Fallback: download PDF and open WhatsApp
    downloadBuyerBillPdf(bill, profile);
    window.open(waUrl, "_blank", "noopener,noreferrer");
    setShareFeedback("PDF downloaded & WhatsApp opened.");
    setTimeout(() => setShareFeedback(""), 4000);
  };

  const isPaid = bill.status === "PAID";
  const isPartial = bill.status === "PARTIAL";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(12, 41, 38, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "560px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          overflow: "hidden",
        }}
      >
        {/* Modal Top Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #edf1f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8faf9",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "1px",
                color: "#477598",
                textTransform: "uppercase",
              }}
            >
              Buyer Bill / Tax Invoice
            </span>
            <h3 style={{ margin: "2px 0 0", color: "#163a35", fontSize: "16px" }}>
              Bill #{bill.billNumber}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 0,
              background: "transparent",
              color: "#788984",
              cursor: "pointer",
              padding: "6px",
              display: "grid",
              placeItems: "center",
              borderRadius: "6px",
            }}
            aria-label="Close bill preview"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Bill Content Body */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
          {/* Business & Buyer Details Card */}
          <div
            style={{
              padding: "16px",
              background: "#fafcfb",
              border: "1px solid #e4ebe8",
              borderRadius: "8px",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div>
                <strong style={{ fontSize: "15px", color: "#163a35" }}>
                  {profile?.businessName || "ScrapFlow Business"}
                </strong>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#61766e" }}>
                  Prepared by {profile?.ownerName || "Business Owner"}
                  {profile?.mobile ? ` · ${profile.mobile}` : ""}
                </p>
                {profile?.gst && (
                  <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#788984" }}>
                    GSTIN: {profile.gst}
                  </p>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "3px 8px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: 700,
                    background: isPaid ? "#e2f4ea" : isPartial ? "#fdf3d8" : "#fde8e4",
                    color: isPaid ? "#206d48" : isPartial ? "#9c6800" : "#b45e4d",
                  }}
                >
                  {isPaid ? "Fully Paid" : isPartial ? "Partial Udhari" : "Unpaid / Udhari"}
                </span>
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#788984" }}>
                  Date: {bill.date}
                </p>
              </div>
            </div>

            <div
              style={{
                borderTop: "1px dashed #dfe8e4",
                paddingTop: "10px",
                fontSize: "12px",
                color: "#385850",
              }}
            >
              <span style={{ fontSize: "10px", textTransform: "uppercase", color: "#788984", fontWeight: 700 }}>
                Billed To (Buyer / Client):
              </span>
              <p style={{ margin: "3px 0 0", fontWeight: 700, fontSize: "13px", color: "#163a35" }}>
                {bill.buyer.name}
              </p>
              {bill.buyer.contactPerson && (
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#61766e" }}>
                  Contact: {bill.buyer.contactPerson}
                </p>
              )}
              {bill.buyer.mobile && (
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#61766e" }}>
                  Mobile: {bill.buyer.mobile}
                </p>
              )}
              {bill.buyer.address && (
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#61766e" }}>
                  Address: {bill.buyer.address}
                </p>
              )}
              {bill.buyer.gstNumber && (
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#61766e" }}>
                  Buyer GST: {bill.buyer.gstNumber}
                </p>
              )}
            </div>
          </div>

          {/* Line Items Table with Quantity in kg */}
          <div style={{ marginBottom: "16px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #edf1f0", color: "#788984", textAlign: "left", fontSize: "11px" }}>
                  <th style={{ padding: "8px 6px" }}>SCRAP ITEM</th>
                  <th style={{ padding: "8px 6px", textAlign: "right" }}>QTY IN KG</th>
                  <th style={{ padding: "8px 6px", textAlign: "right" }}>RATE (₹)</th>
                  <th style={{ padding: "8px 6px", textAlign: "right" }}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #edf1f0" }}>
                    <td style={{ padding: "10px 6px", fontWeight: 600, color: "#163a35" }}>
                      {item.name}
                    </td>
                    <td style={{ padding: "10px 6px", textAlign: "right" }}>
                      <strong>{Number(item.quantityKg).toLocaleString("en-IN")} kg</strong>
                      {item.quantityKg >= 1000 && (
                        <small style={{ display: "block", color: "#61766e", fontSize: "10px" }}>
                          ({formatQuantity(item.quantityKg)})
                        </small>
                      )}
                    </td>
                    <td style={{ padding: "10px 6px", textAlign: "right", color: "#566d66" }}>
                      ₹{Number(item.rate).toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "10px 6px", textAlign: "right", fontWeight: 700, color: "#163a35" }}>
                      {formatBillCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bill Totals Summary */}
          <div
            style={{
              background: "#f4f8f6",
              borderRadius: "8px",
              padding: "14px 16px",
              fontSize: "13px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", color: "#566d66" }}>
              <span>Total Bill Amount</span>
              <strong style={{ fontSize: "16px", color: "#163a35" }}>
                {formatBillCurrency(bill.totalAmount)}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#206d48" }}>
              <span>Amount Paid Now</span>
              <strong>{formatBillCurrency(bill.amountPaid)}</strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid #dfe8e4",
                paddingTop: "8px",
                color: bill.outstandingAmount > 0 ? "#b45e4d" : "#206d48",
                fontWeight: 700,
              }}
            >
              <span>Udhari / Due Balance to Collect</span>
              <span style={{ fontSize: "15px" }}>
                {formatBillCurrency(bill.outstandingAmount)}
              </span>
            </div>
          </div>

          {bill.notes && (
            <p style={{ margin: "12px 0 0", fontSize: "11px", color: "#788984" }}>
              <strong>Challan / Notes:</strong> {bill.notes}
            </p>
          )}

          {shareFeedback && (
            <p className={styles.successMessage} style={{ margin: "10px 0 0", textAlign: "center" }}>
              {shareFeedback}
            </p>
          )}
        </div>

        {/* Modal Action Buttons Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #edf1f0",
            background: "#fafcfb",
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: "100%" }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                flex: "1 1 auto",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "10px 14px",
                minHeight: "42px",
                borderRadius: "6px",
                border: "1px solid #dfe8e4",
                background: "#fff",
                color: "#163a35",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Printer size={15} /> Print Bill
            </button>
            <button
              type="button"
              onClick={handleDownload}
              style={{
                flex: "1 1 auto",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "10px 14px",
                minHeight: "42px",
                borderRadius: "6px",
                border: 0,
                background: "#b45e4d",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Download size={15} /> Download PDF
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              style={{
                flex: "1 1 auto",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "10px 14px",
                minHeight: "42px",
                borderRadius: "6px",
                border: 0,
                background: "#1e9c62",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <MessageCircle size={15} /> Send WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
