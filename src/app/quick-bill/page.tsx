"use client";

import { useState } from "react";
import { FeaturePage } from "@/components/FeaturePage";
import styles from "@/components/FeaturePage.module.css";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export default function QuickBillPage() {
  const [billType, setBillType] = useState("Sale / bill to buyer");
  const [quantity, setQuantity] = useState("100");
  const [rate, setRate] = useState("40");
  const total = (Number(quantity) || 0) * (Number(rate) || 0);

  return <FeaturePage active="/quick-bill" eyebrow="FAST ENTRY" title="Quick bill" description="Make a small bill directly for a company without opening the full purchase or sale register.">
    <section className={styles.panel} id="quick-bill-form"><div className={styles.panelHeader}><div><h2>Make a quick bill</h2><p>Use this for a simple company transaction. Stock and outstanding will be updated when connected to the database.</p></div><span className={`${styles.status} ${styles.blue}`}>Simple entry</span></div><div className={styles.formGrid}>
      <label>Bill type<select value={billType} onChange={(event) => setBillType(event.target.value)}><option>Sale / bill to buyer</option><option>Purchase / bill from supplier</option></select></label>
      <label>Company<select><option>GreenEarth Industries</option><option>Shree Metals Pvt. Ltd.</option><option>Mahalaxmi Traders</option></select></label>
      <label>Bill date<input type="date" defaultValue="2026-09-09" /></label>
      <label>Scrap item<select><option>Ferrous metal</option><option>Aluminium</option><option>Copper wire</option><option>Paper & cardboard</option></select></label>
      <label>Quantity<input type="number" min="0" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
      <label>Rate per unit<input type="number" min="0" value={rate} onChange={(event) => setRate(event.target.value)} /></label>
      <label>Payment received now<input type="number" min="0" defaultValue="0" /></label>
      <label>Payment status<select><option>Part payment / udhari</option><option>Fully paid</option><option>Pay later</option></select></label>
    </div><div className={styles.billTotal}><span>Total bill amount</span><strong>{money.format(total)}</strong><small>{billType} · Remaining amount will be tracked in Udhari / Outstanding</small></div><div className={styles.billActions}><button className={styles.saveButton}>Save quick bill</button><a className={styles.secondaryButton} href="/udhari">View udhari</a></div></section>
    <section className={styles.panel}><div className={styles.panelHeader}><div><h2>When to use Quick bill</h2><p>For full purchases or deliveries with more details, use Buy scrap or Sell scrap.</p></div></div><div className={styles.helpGrid}><div><strong>Sale / bill to buyer</strong><small>Reduces available stock and adds money to receive.</small></div><div><strong>Purchase / bill from supplier</strong><small>Increases available stock and adds money to pay.</small></div></div></section>
  </FeaturePage>;
}
