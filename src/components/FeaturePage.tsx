"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, BarChart3, Bell, Boxes, Building2, ChevronDown, CircleDollarSign, LayoutDashboard, Menu, Settings2, X } from "lucide-react";
import styles from "./FeaturePage.module.css";
import { emptyBusinessProfile, readBusinessProfile, saveBusinessProfile } from "@/lib/business-profile";

type FeatureRow = { title: string; subtitle: string; amount?: string; status?: string; tone?: "green" | "amber" | "red" | "blue" };

const navigation = [
  ["/", "Dashboard", LayoutDashboard],
  ["/companies", "Companies", Building2],
  ["/stock", "Scrap stock", Boxes],
  ["/purchases", "Buy scrap", ArrowDownLeft],
  ["/sales", "Sell scrap", ArrowUpRight],
  ["/payments", "Payments", CircleDollarSign],
  ["/udhari", "Udhari / Outstanding", CircleDollarSign],
  ["/quick-bill", "Quick bill", CircleDollarSign],
  ["/reports", "Reports", BarChart3],
  ["/settings", "Settings", Settings2],
] as const;

export function FeaturePage({ active, eyebrow, title, description, actionLabel, actionHref, children }: { active: string; eyebrow: string; title: string; description: string; actionLabel?: string; actionHref?: string; children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profile, setProfile] = useState({ businessName: "Main workspace", ownerName: "Business owner" });
  useEffect(() => { const details = readBusinessProfile(); if (details) setProfile({ businessName: details.businessName || "Main workspace", ownerName: details.ownerName || "Business owner" }); }, []);
  return <div className={styles.appShell}>
    <aside className={`${styles.sidebar} ${mobileNavOpen ? styles.sidebarOpen : ""}`}>
      <div className={styles.brandRow}><div className={styles.brandMark}>S</div><div><strong>ScrapFlow</strong><span>Business desk</span></div><button className={styles.closeNav} onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
      <div className={styles.workspaceSwitch}><span className={styles.workspaceDot} />{profile.businessName} <ChevronDown size={15} /></div>
      <nav className={styles.nav}><p className={styles.navLabel}>Overview</p>{navigation.slice(0, 3).map(([href, label, Icon]) => <NavItem key={href} href={href} label={label} Icon={Icon} active={active === href} />)}<p className={styles.navLabel}>Daily work</p>{navigation.slice(3, 8).map(([href, label, Icon]) => <NavItem key={href} href={href} label={label} Icon={Icon} active={active === href} />)}<p className={styles.navLabel}>Insights</p>{navigation.slice(8).map(([href, label, Icon]) => <NavItem key={href} href={href} label={label} Icon={Icon} active={active === href} />)}</nav>
      <div className={styles.sidebarFooter}><div className={styles.avatar}>{profile.ownerName.slice(0, 2).toUpperCase()}</div><div><strong>{profile.ownerName}</strong><span>Owner</span></div><ChevronDown size={15} /></div>
    </aside>
    {mobileNavOpen && <button className={styles.scrim} onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" />}
    <main className={styles.main}><header className={styles.topbar}><button className={styles.menuButton} onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div className={styles.breadcrumb}><span>Workspace</span><b>/</b><strong>{title}</strong></div><div className={styles.topActions}><button className={styles.iconButton} aria-label="Notifications"><Bell size={19} /><i /></button><div className={styles.datePill}>Tuesday, 09 Sep 2026 <ChevronDown size={15} /></div></div></header>
      <section className={styles.content}><div className={styles.hero}><div><p className={styles.eyebrow}>{eyebrow}</p><h1>{title}</h1><p className={styles.heroCopy}>{description}</p></div>{actionLabel && <a className={styles.primaryButton} href={actionHref || "#form"}><span>+</span>{actionLabel}</a>}</div>{children}</section>
    </main>
  </div>;
}

function NavItem({ href, label, Icon, active }: { href: string; label: string; Icon: typeof LayoutDashboard; active: boolean }) { return <a className={`${styles.navItem} ${active ? styles.navItemActive : ""}`} href={href}><Icon size={17} />{label}</a>; }

export function SummaryCards({ cards }: { cards: { label: string; value: string; note: string; tone: "green" | "amber" | "blue" | "red" }[] }) { return <div className={styles.summaryGrid}>{cards.map((card) => <article className={styles.summaryCard} key={card.label}><span>{card.label}</span><strong>{card.value}</strong><small className={styles[card.tone]}>{card.note}</small></article>)}</div>; }

export function DataPanel({ title, subtitle, rows, emptyText = "No records found", allowDelete = false }: { title: string; subtitle: string; rows: FeatureRow[]; emptyText?: string; allowDelete?: boolean }) {
  const [currentRows, setCurrentRows] = useState(rows);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const statuses = ["All", ...Array.from(new Set(currentRows.map((row) => row.status).filter(Boolean)))];
  const visibleRows = currentRows.filter((row) => {
    const matchesSearch = `${row.title} ${row.subtitle} ${row.amount || ""}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || row.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const deleteRow = (title: string) => { if (window.confirm(`Delete ${title}? This action cannot be undone.`)) setCurrentRows((items) => items.filter((row) => row.title !== title)); };
  return <section className={styles.panel}><div className={styles.panelHeader}><div><h2>{title}</h2><p>{subtitle}</p></div><div className={styles.filterTools}><input className={styles.searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" aria-label={`Search ${title}`} /><label className={styles.filterSelect}><span>Filter</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label={`Filter ${title}`}>{statuses.map((status) => <option key={status}>{status}</option>)}</select><ChevronDown size={14} /></label></div></div><div className={styles.dataList}>{visibleRows.length ? visibleRows.map((row) => <div className={styles.dataRow} key={`${row.title}-${row.subtitle}`}><div><strong>{row.title}</strong><small>{row.subtitle}</small></div>{row.amount && <strong>{row.amount}</strong>}{row.status && <span className={`${styles.status} ${styles[row.tone || "blue"]}`}>{row.status}</span>}{allowDelete && <button className={styles.deleteButton} type="button" onClick={() => deleteRow(row.title)}>Delete</button>}</div>) : <p className={styles.empty}>{emptyText}</p>}</div></section>;
}

export function FormPanel({ title, fields, storageKey = title, onSave, requiredFields = fields }: { title: string; fields: string[]; storageKey?: string; onSave?: (values: Record<string, string>) => void; requiredFields?: string[] }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((field) => [field, field === "Unit" ? "Tonne (MT)" : ""] as const)));
  const [message, setMessage] = useState("");
  const save = () => {
    const requiredField = requiredFields.find((field) => !values[field]?.trim());
    if (requiredField) { setMessage(`${requiredField} is required.`); return; }
    const key = `scrapflow-${storageKey.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]") as Record<string, string>[];
    localStorage.setItem(key, JSON.stringify([{ ...values, id: Date.now() }, ...existing]));
    onSave?.(values);
    setMessage(`${title} saved successfully.`);
    setValues(Object.fromEntries(fields.map((field) => [field, field === "Unit" ? "Tonne (MT)" : ""] as const)));
  };
  return <section className={styles.panel} id="form"><div className={styles.panelHeader}><div><h2>{title}</h2><p>Enter details below. Saved details will remain available on this device.</p></div></div><div className={styles.formGrid}>{fields.map((field) => <label key={field}>{field}{field === "Unit" ? <select value={values[field]} onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))}><option>Tonne (MT)</option><option>Kilogram (kg)</option><option>Long ton</option><option>Gross ton</option><option>Pound (lb)</option></select> : field === "Company type" ? <select value={values[field]} onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))}><option value="">Select company type</option><option>Supplier</option><option>Buyer</option><option>Both</option></select> : <input value={values[field]} onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))} placeholder={`Enter ${field.toLowerCase()}`} />}</label>)}</div><button className={styles.saveButton} type="button" onClick={save}>Save details</button>{message && <p className={message.includes("successfully") ? styles.successMessage : styles.errorMessage}>{message}</p>}</section>;
}

export function BusinessProfileForm() {
  const [profile, setProfile] = useState(emptyBusinessProfile);
  const [message, setMessage] = useState("");
  useEffect(() => {
    try {
      const saved = readBusinessProfile();
      if (saved) setProfile(saved);
    } catch {
      setMessage("Saved details could not be loaded in this browser.");
    }
  }, []);
  const update = (field: keyof typeof profile, value: string) => setProfile((current) => ({ ...current, [field]: value }));
  const save = () => {
    if (!profile.businessName.trim() || !profile.ownerName.trim()) { setMessage("Business name and owner name are required."); return; }
    if (saveBusinessProfile(profile)) setMessage("Business details saved successfully."); else setMessage("Details could not be saved. Please allow browser storage and try again.");
  };
  return <section className={styles.panel} id="business-profile"><div className={styles.panelHeader}><div><h2>Business details</h2><p>These details will appear on the dashboard, bills, and WhatsApp messages.</p></div></div><div className={styles.formGrid}>
    <label>Business name<input value={profile.businessName} onChange={(event) => update("businessName", event.target.value)} placeholder="Example: Sharma Scrap Traders" /></label>
    <label>Owner name<input value={profile.ownerName} onChange={(event) => update("ownerName", event.target.value)} placeholder="Enter owner name" /></label>
    <label>Mobile number<input value={profile.mobile} onChange={(event) => update("mobile", event.target.value)} placeholder="Enter business mobile" /></label>
    <label>Email<input value={profile.email} onChange={(event) => update("email", event.target.value)} placeholder="Enter business email" /></label>
    <label>Business address<input value={profile.address} onChange={(event) => update("address", event.target.value)} placeholder="Enter business address" /></label>
    <label>GST number<input value={profile.gst} onChange={(event) => update("gst", event.target.value)} placeholder="Enter GST number" /></label>
  </div><button className={styles.saveButton} type="button" onClick={save}>Save business details</button>{message && <p className={message.includes("successfully") ? styles.successMessage : styles.errorMessage}>{message}</p>}</section>;
}
