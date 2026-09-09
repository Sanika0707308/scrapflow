"use client";

import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import { FeaturePage } from "@/components/FeaturePage";
import styles from "@/components/FeaturePage.module.css";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export default function QuickBillPage() {
  const [billType, setBillType] = useState("Sale / bill to buyer");
  const [company, setCompany] = useState("GreenEarth Industries");
  const [mobile, setMobile] = useState("919876543210");
  const [quantity, setQuantity] = useState("100");
  const [rate, setRate] = useState("40");
  const [paymentReceived, setPaymentReceived] = useState("0");
  const [billDate, setBillDate] = useState("2026-09-09");
  const [scrapItem, setScrapItem] = useState("Ferrous metal");
  const [showPreview, setShowPreview] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [businessName, setBusinessName] = useState("Your business name");
  const [ownerName, setOwnerName] = useState("Business owner");
  const total = (Number(quantity) || 0) * (Number(rate) || 0);
  const remaining = Math.max(total - (Number(paymentReceived) || 0), 0);
  useEffect(() => { const saved = localStorage.getItem("scrapflow-business-profile"); if (saved) { const details = JSON.parse(saved) as { businessName?: string; ownerName?: string }; setBusinessName(details.businessName || "Your business name"); setOwnerName(details.ownerName || "Business owner"); } }, []);
  const whatsappMessage = `Hello ${company}, your ${billType.toLowerCase()} from ${businessName} is ${money.format(total)}. Paid now: ${money.format(Number(paymentReceived) || 0)}. Remaining: ${money.format(remaining)}. Contact: ${ownerName}.`;
  const whatsappLink = `https://web.whatsapp.com/send?phone=${mobile.replace(/\D/g, "")}&text=${encodeURIComponent(whatsappMessage)}`;
  const downloadPdf = () => {
    if (!company || total <= 0) { setSavedMessage("Please select a company and enter a quantity and rate greater than zero."); return; }
    const pdf = new jsPDF();
    pdf.setFontSize(22);
    pdf.setTextColor(27, 74, 64);
    pdf.text(businessName, 20, 25);
    pdf.setFontSize(10);
    pdf.setTextColor(90, 110, 102);
    pdf.text(`Prepared by: ${ownerName}`, 20, 33);
    pdf.text(`Bill date: ${billDate}`, 20, 40);
    pdf.text(`Bill to: ${company}`, 20, 55);
    pdf.line(20, 62, 190, 62);
    pdf.setFontSize(12);
    pdf.setTextColor(45, 78, 68);
    pdf.text("Description", 20, 75);
    pdf.text("Quantity", 105, 75);
    pdf.text("Rate", 135, 75);
    pdf.text("Amount", 165, 75);
    pdf.setFontSize(11);
    pdf.text(`${billType} - ${scrapItem}`, 20, 88);
    pdf.text(String(quantity), 105, 88);
    pdf.text(money.format(Number(rate) || 0), 135, 88);
    pdf.text(money.format(total), 165, 88);
    pdf.line(20, 96, 190, 96);
    pdf.text(`Paid now: ${money.format(Number(paymentReceived) || 0)}`, 110, 110);
    pdf.text(`Remaining udhari: ${money.format(remaining)}`, 110, 119);
    pdf.setFontSize(10);
    pdf.setTextColor(110, 130, 120);
    pdf.text("Thank you for your business.", 20, 140);
    pdf.save(`scrapflow-bill-${company.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
    setSavedMessage("Bill PDF downloaded successfully.");
  };
  const saveBill = () => {
    if (!company || total <= 0) { setSavedMessage("Please select a company and enter a quantity and rate greater than zero."); return; }
    const existingBills = JSON.parse(localStorage.getItem("scrapflow-bills") || "[]") as object[];
    existingBills.unshift({ id: Date.now(), businessName, ownerName, billType, company, mobile, quantity: Number(quantity), rate: Number(rate), total, paymentReceived: Number(paymentReceived) || 0, remaining, createdAt: new Date().toISOString() });
    localStorage.setItem("scrapflow-bills", JSON.stringify(existingBills));
    setSavedMessage(`Bill saved successfully for ${company}.`);
    setShowPreview(true);
  };

  return <FeaturePage active="/quick-bill" eyebrow="FAST ENTRY" title="Quick bill" description="Make a small bill directly for a company without opening the full purchase or sale register.">
    <section className={styles.panel} id="quick-bill-form"><div className={styles.panelHeader}><div><h2>Make a quick bill</h2><p>Use this for a simple company transaction. Stock and outstanding will be updated when connected to the database.</p></div><span className={`${styles.status} ${styles.blue}`}>Simple entry</span></div><div className={styles.formGrid}>
      <label>Bill type<select value={billType} onChange={(event) => setBillType(event.target.value)}><option>Sale / bill to buyer</option><option>Purchase / bill from supplier</option></select></label>
      <label>Company<select value={company} onChange={(event) => setCompany(event.target.value)}><option>GreenEarth Industries</option><option>Shree Metals Pvt. Ltd.</option><option>Mahalaxmi Traders</option></select></label>
      <label>Company WhatsApp number<input value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="Example: 919876543210" /></label>
      <label>Bill date<input type="date" value={billDate} onChange={(event) => setBillDate(event.target.value)} /></label>
      <label>Scrap item<select value={scrapItem} onChange={(event) => setScrapItem(event.target.value)}><option>Ferrous metal</option><option>Aluminium</option><option>Copper wire</option><option>Paper & cardboard</option></select></label>
      <label>Quantity<input type="number" min="0" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
      <label>Rate per unit<input type="number" min="0" value={rate} onChange={(event) => setRate(event.target.value)} /></label>
      <label>Payment received now<input type="number" min="0" value={paymentReceived} onChange={(event) => setPaymentReceived(event.target.value)} /></label>
      <label>Payment status<select><option>Part payment / udhari</option><option>Fully paid</option><option>Pay later</option></select></label>
    </div><div className={styles.billTotal}><span>Total bill amount</span><strong>{money.format(total)}</strong><small>{billType} · Remaining: {money.format(remaining)} will be tracked in Udhari / Outstanding</small></div><div className={styles.billActions}><button className={styles.saveButton} type="button" onClick={saveBill}>Save quick bill</button><button className={styles.secondaryButton} type="button" onClick={() => setShowPreview((current) => !current)}>{showPreview ? "Hide bill" : "View bill"}</button><button className={styles.pdfButton} type="button" onClick={downloadPdf}>Download PDF</button><a className={styles.whatsappButton} href={whatsappLink} target="_blank" rel="noreferrer">Open WhatsApp Web</a></div>{savedMessage && <p className={savedMessage.includes("successfully") ? styles.successMessage : styles.errorMessage}>{savedMessage}</p>}</section>
    {showPreview && <section className={styles.billPreview}><div className={styles.billPreviewHeader}><div><p className={styles.eyebrow}>BILL PREVIEW</p><h2>{businessName}</h2><small>From {ownerName} · Bill to {company} · 09 Sep 2026</small></div><strong>{money.format(total)}</strong></div><div className={styles.previewLine}><span>{billType}</span><span>{quantity} × {money.format(Number(rate) || 0)}</span></div><div className={styles.previewLine}><span>Paid now</span><strong>{money.format(Number(paymentReceived) || 0)}</strong></div><div className={styles.previewLine}><span>Remaining udhari</span><strong>{money.format(remaining)}</strong></div><p className={styles.previewNote}>This bill can be shared directly with {company} on WhatsApp.</p></section>}
    <section className={styles.panel}><div className={styles.panelHeader}><div><h2>When to use Quick bill</h2><p>For full purchases or deliveries with more details, use Buy scrap or Sell scrap.</p></div></div><div className={styles.helpGrid}><div><strong>Sale / bill to buyer</strong><small>Reduces available stock and adds money to receive.</small></div><div><strong>Purchase / bill from supplier</strong><small>Increases available stock and adds money to pay.</small></div></div></section>
  </FeaturePage>;
}
