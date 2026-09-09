"use client";

import { useState, type ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, BarChart3, Bell, Boxes, Building2, ChevronDown, CircleDollarSign, LayoutDashboard, Menu, Settings2, X } from "lucide-react";
import styles from "./FeaturePage.module.css";

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
  return <div className={styles.appShell}>
    <aside className={`${styles.sidebar} ${mobileNavOpen ? styles.sidebarOpen : ""}`}>
      <div className={styles.brandRow}><div className={styles.brandMark}>S</div><div><strong>ScrapFlow</strong><span>Business desk</span></div><button className={styles.closeNav} onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
      <div className={styles.workspaceSwitch}><span className={styles.workspaceDot} />Main workspace <ChevronDown size={15} /></div>
      <nav className={styles.nav}><p className={styles.navLabel}>Overview</p>{navigation.slice(0, 3).map(([href, label, Icon]) => <NavItem key={href} href={href} label={label} Icon={Icon} active={active === href} />)}<p className={styles.navLabel}>Daily work</p>{navigation.slice(3, 8).map(([href, label, Icon]) => <NavItem key={href} href={href} label={label} Icon={Icon} active={active === href} />)}<p className={styles.navLabel}>Insights</p>{navigation.slice(8).map(([href, label, Icon]) => <NavItem key={href} href={href} label={label} Icon={Icon} active={active === href} />)}</nav>
      <div className={styles.sidebarFooter}><div className={styles.avatar}>AK</div><div><strong>Arjun Kumar</strong><span>Owner</span></div><ChevronDown size={15} /></div>
    </aside>
    {mobileNavOpen && <button className={styles.scrim} onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" />}
    <main className={styles.main}><header className={styles.topbar}><button className={styles.menuButton} onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div className={styles.breadcrumb}><span>Workspace</span><b>/</b><strong>{title}</strong></div><div className={styles.topActions}><button className={styles.iconButton} aria-label="Notifications"><Bell size={19} /><i /></button><div className={styles.datePill}>Tuesday, 09 Sep 2026 <ChevronDown size={15} /></div></div></header>
      <section className={styles.content}><div className={styles.hero}><div><p className={styles.eyebrow}>{eyebrow}</p><h1>{title}</h1><p className={styles.heroCopy}>{description}</p></div>{actionLabel && <a className={styles.primaryButton} href={actionHref || "#form"}><span>+</span>{actionLabel}</a>}</div>{children}</section>
    </main>
  </div>;
}

function NavItem({ href, label, Icon, active }: { href: string; label: string; Icon: typeof LayoutDashboard; active: boolean }) { return <a className={`${styles.navItem} ${active ? styles.navItemActive : ""}`} href={href}><Icon size={17} />{label}</a>; }

export function SummaryCards({ cards }: { cards: { label: string; value: string; note: string; tone: "green" | "amber" | "blue" | "red" }[] }) { return <div className={styles.summaryGrid}>{cards.map((card) => <article className={styles.summaryCard} key={card.label}><span>{card.label}</span><strong>{card.value}</strong><small className={styles[card.tone]}>{card.note}</small></article>)}</div>; }

export function DataPanel({ title, subtitle, rows, emptyText = "No records found" }: { title: string; subtitle: string; rows: FeatureRow[]; emptyText?: string }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const statuses = ["All", ...Array.from(new Set(rows.map((row) => row.status).filter(Boolean)))];
  const visibleRows = rows.filter((row) => {
    const matchesSearch = `${row.title} ${row.subtitle} ${row.amount || ""}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || row.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  return <section className={styles.panel}><div className={styles.panelHeader}><div><h2>{title}</h2><p>{subtitle}</p></div><div className={styles.filterTools}><input className={styles.searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" aria-label={`Search ${title}`} /><label className={styles.filterSelect}><span>Filter</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label={`Filter ${title}`}>{statuses.map((status) => <option key={status}>{status}</option>)}</select><ChevronDown size={14} /></label></div></div><div className={styles.dataList}>{visibleRows.length ? visibleRows.map((row) => <div className={styles.dataRow} key={`${row.title}-${row.subtitle}`}><div><strong>{row.title}</strong><small>{row.subtitle}</small></div>{row.amount && <strong>{row.amount}</strong>}{row.status && <span className={`${styles.status} ${styles[row.tone || "blue"]}`}>{row.status}</span>}</div>) : <p className={styles.empty}>{emptyText}</p>}</div></section>;
}

export function FormPanel({ title, fields }: { title: string; fields: string[] }) { return <section className={styles.panel} id="form"><div className={styles.panelHeader}><div><h2>{title}</h2><p>Enter details below. You can connect this form to the database next.</p></div></div><div className={styles.formGrid}>{fields.map((field) => <label key={field}>{field}<input placeholder={`Enter ${field.toLowerCase()}`} /></label>)}</div><button className={styles.saveButton}>Save details</button></section>; }
