"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ChevronDown,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Menu,
  Settings2,
  Truck,
  X,
} from "lucide-react";
import styles from "./page.module.css";
import { readBusinessProfile } from "@/lib/business-profile";
import { formatQuantity } from "@/lib/quantity";

type DashboardData = {
  stock: Array<{
    id: string;
    name: string;
    unit: string;
    currentStock: string | number;
  }>;
  month: {
    purchaseAmount: string | number;
    salesAmount: string | number;
    purchaseCount: number;
    salesCount: number;
  };
  outstanding: {
    receivable: string | number;
    payable: string | number;
  };
  companyCount: number;
};

type ActivityItem = {
  id: string;
  type: "Sale" | "Purchase" | "Payment In" | "Payment Out";
  company: string;
  date: string;
  amount: string;
  status: "Completed" | "Partial" | "Payable";
  timestamp: number;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

const colors = ["green", "blue", "orange", "purple"] as const;

export default function Home() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profile, setProfile] = useState({ businessName: "Main workspace", ownerName: "Business owner" });
  const [profileReady, setProfileReady] = useState(false);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [monthReceived, setMonthReceived] = useState(0);
  const [monthPaid, setMonthPaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load business profile from localStorage
  useEffect(() => {
    const details = readBusinessProfile();
    if (details) {
      setTimeout(() => {
        setProfile({
          businessName: details.businessName || "Main workspace",
          ownerName: details.ownerName || "Business owner",
        });
        setProfileReady(Boolean(details.businessName && details.ownerName));
      }, 0);
    }
  }, []);

  // Fetch live dashboard and activity data from backend APIs
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, purchasesRes, salesRes, paymentsRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/purchases?take=6"),
        fetch("/api/sales?take=6"),
        fetch("/api/payments?take=15"),
      ]);

      if (!dashRes.ok) throw new Error(`Dashboard API error (status ${dashRes.status})`);
      if (!purchasesRes.ok) throw new Error(`Purchases API error (status ${purchasesRes.status})`);
      if (!salesRes.ok) throw new Error(`Sales API error (status ${salesRes.status})`);
      if (!paymentsRes.ok) throw new Error(`Payments API error (status ${paymentsRes.status})`);

      const [dashJson, purchasesJson, salesJson, paymentsJson] = await Promise.all([
        dashRes.json(),
        purchasesRes.json(),
        salesRes.json(),
        paymentsRes.json(),
      ]);

      setDashboard(dashJson);

      // Compute monthly payment cash flow
      const now = new Date();
      let recTotal = 0;
      let payTotal = 0;
      for (const p of paymentsJson) {
        const pDate = new Date(p.paymentDate);
        if (pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear()) {
          const amt = Number(p.amount) || 0;
          if (p.direction === "IN") recTotal += amt;
          else if (p.direction === "OUT") payTotal += amt;
        }
      }
      setMonthReceived(recTotal);
      setMonthPaid(payTotal);

      // Build unified recent activities
      const unified: ActivityItem[] = [];

      for (const s of salesJson) {
        unified.push({
          id: `sale-${s.id}`,
          type: "Sale",
          company: s.buyer?.name || "Buyer",
          date: new Date(s.saleDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
          amount: formatCurrency(Number(s.totalAmount) || 0),
          status: s.status === "PAID" ? "Completed" : s.status === "PARTIAL" ? "Partial" : "Payable",
          timestamp: new Date(s.createdAt).getTime(),
        });
      }

      for (const p of purchasesJson) {
        unified.push({
          id: `purch-${p.id}`,
          type: "Purchase",
          company: p.supplier?.name || "Supplier",
          date: new Date(p.purchaseDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
          amount: formatCurrency(Number(p.totalAmount) || 0),
          status: p.status === "PAID" ? "Completed" : p.status === "PARTIAL" ? "Partial" : "Payable",
          timestamp: new Date(p.createdAt).getTime(),
        });
      }

      for (const pay of paymentsJson) {
        const isInc = pay.direction === "IN";
        unified.push({
          id: `pay-${pay.id}`,
          type: isInc ? "Payment In" : "Payment Out",
          company: pay.company?.name || "Party",
          date: new Date(pay.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
          amount: `${isInc ? "+" : "-"}${formatCurrency(Number(pay.amount) || 0)}`,
          status: "Completed",
          timestamp: new Date(pay.createdAt).getTime(),
        });
      }

      unified.sort((a, b) => b.timestamp - a.timestamp);
      setActivities(unified.slice(0, 8));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load dashboard data";
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

  // Derived calculations
  const totalStockKg =
    dashboard?.stock.reduce((sum, item) => sum + (Number(item.currentStock) || 0), 0) || 0;
  const stockFormatted = formatQuantity(totalStockKg);
  const [stockVal, stockUnit] = stockFormatted.split(" ");
  const purchaseAmount = Number(dashboard?.month.purchaseAmount) || 0;
  const salesAmount = Number(dashboard?.month.salesAmount) || 0;
  const receivable = Number(dashboard?.outstanding.receivable) || 0;
  const payable = Number(dashboard?.outstanding.payable) || 0;
  const netOutstanding = receivable - payable;

  const totalOutstandingBar = receivable + payable;
  const recPercent = totalOutstandingBar > 0 ? (receivable / totalOutstandingBar) * 100 : 50;
  const payPercent = totalOutstandingBar > 0 ? (payable / totalOutstandingBar) * 100 : 50;

  const maxStock = Math.max(...(dashboard?.stock.map((s) => Number(s.currentStock) || 0) || [1]), 1);

  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className={styles.appShell}>
      <aside className={`${styles.sidebar} ${mobileNavOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.brandRow}>
          <div className={styles.brandMark}>S</div>
          <div>
            <strong>ScrapFlow</strong>
            <span>Business desk</span>
          </div>
          <button
            className={styles.closeNav}
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.workspaceSwitch}>
          <span className={styles.workspaceDot} />
          {profile.businessName} <ChevronDown size={15} />
        </div>

        <nav className={styles.nav}>
          <p className={styles.navLabel}>Overview</p>
          <Link className={`${styles.navItem} ${styles.navItemActive}`} href="/">
            <LayoutDashboard size={18} />
            Dashboard
          </Link>
          <a className={styles.navItem} href="/companies">
            <Building2 size={18} />
            Companies
            <span className={styles.navCount}>{dashboard?.companyCount ?? 0}</span>
          </a>
          <a className={styles.navItem} href="/stock">
            <Boxes size={18} />
            Scrap stock
          </a>

          <p className={styles.navLabel}>Daily work</p>
          <a className={styles.navItem} href="/purchases">
            <ArrowDownLeft size={18} />
            Buy scrap
          </a>
          <a className={styles.navItem} href="/sales">
            <ArrowUpRight size={18} />
            Sell scrap
          </a>
          <a className={styles.navItem} href="/payments">
            <CircleDollarSign size={18} />
            Payments
          </a>
          <a className={styles.navItem} href="/udhari">
            <CircleDollarSign size={18} />
            Udhari / Outstanding
          </a>
          <a className={styles.navItem} href="/quick-bill">
            <CircleDollarSign size={18} />
            Quick bill
          </a>

          <p className={styles.navLabel}>Insights</p>
          <a className={styles.navItem} href="/reports">
            <BarChart3 size={18} />
            Reports
          </a>
          <a className={styles.navItem} href="/settings">
            <Settings2 size={18} />
            Settings
          </a>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.avatar}>{profile.ownerName.slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>{profile.ownerName}</strong>
            <span>Owner</span>
          </div>
          <ChevronDown size={15} />
        </div>
      </aside>

      {mobileNavOpen && (
        <button
          className={styles.scrim}
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <main className={styles.main} id="dashboard">
        <header className={styles.topbar}>
          <button
            className={styles.menuButton}
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className={styles.breadcrumb}>
            <span>Workspace</span>
            <b>/</b>
            <strong>Dashboard</strong>
          </div>
          <div className={styles.topActions}>
            <button className={styles.iconButton} aria-label="Notifications">
              <Bell size={19} />
              <i />
            </button>
            <div className={styles.datePill}>
              {todayStr} <ChevronDown size={15} />
            </div>
          </div>
        </header>

        <section className={styles.content}>
          <div className={styles.hero}>
            <div>
              <p className={styles.eyebrow}>{todayStr.toUpperCase()}</p>
              <h1>Welcome, {profile.ownerName}.</h1>
              <p className={styles.heroCopy}>
                Here&apos;s what&apos;s moving across your scrap business today.
              </p>
            </div>
            <div className={styles.heroActions}>
              {!profileReady && (
                <a className={styles.setupHint} href="/settings">
                  Set up business details
                </a>
              )}
              <a className={styles.primaryButton} href="/quick-bill">
                <span>+</span>Quick bill
              </a>
            </div>
          </div>

          {error && (
            <p className={styles.errorMessage} style={{ margin: "0 0 16px" }}>
              {error}
            </p>
          )}

          {/* KPI Summary Cards */}
          <div className={styles.kpiGrid}>
            <MetricCard
              label="Total stock"
              value={loading ? "..." : stockVal}
              suffix={loading ? "" : stockUnit}
              trend={dashboard ? `${dashboard.stock.length} materials` : "0 materials"}
              trendText="in yard inventory"
              icon={<Boxes size={19} />}
              tone="teal"
            />
            <MetricCard
              label="Purchase amount"
              value={loading ? "..." : formatCurrency(purchaseAmount)}
              trend={dashboard ? `${dashboard.month.purchaseCount} bills` : "0 bills"}
              trendText="bought this month"
              icon={<ArrowDownLeft size={19} />}
              tone="amber"
            />
            <MetricCard
              label="Sales amount"
              value={loading ? "..." : formatCurrency(salesAmount)}
              trend={dashboard ? `${dashboard.month.salesCount} deliveries` : "0 deliveries"}
              trendText="sold this month"
              icon={<ArrowUpRight size={19} />}
              tone="blue"
            />
            <MetricCard
              label="Net outstanding"
              value={
                loading
                  ? "..."
                  : `${netOutstanding >= 0 ? "+" : ""}${formatCurrency(netOutstanding)}`
              }
              trend={`Due: ${formatCurrency(receivable)}`}
              trendText={`| Owed: ${formatCurrency(payable)}`}
              icon={<CircleDollarSign size={19} />}
              tone={netOutstanding >= 0 ? "teal" : "coral"}
              negative={netOutstanding < 0}
            />
          </div>

          {/* Cash Position & Stock Snapshot Grid */}
          <div className={styles.dashboardGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Cash & Udhari position</h2>
                  <p>Payables and receivables at a glance</p>
                </div>
                <a className={styles.textLink} href="/udhari">
                  View udhari <ArrowUpRight size={15} />
                </a>
              </div>

              {loading ? (
                <div className={styles.emptyDashboard}>Loading balances...</div>
              ) : (
                <div className={styles.balanceRows}>
                  <BalanceRow
                    label="Money to receive (Buyers)"
                    detail="Pending collection from sales"
                    amount={formatCurrency(receivable)}
                    percentage={`${recPercent.toFixed(1)}%`}
                    tone="receive"
                  />
                  <BalanceRow
                    label="Money to pay (Suppliers)"
                    detail="Pending payout for purchases"
                    amount={formatCurrency(payable)}
                    percentage={`${payPercent.toFixed(1)}%`}
                    tone="pay"
                  />
                </div>
              )}

              <div className={styles.cashSummary}>
                <div>
                  <span className={styles.greenDot} />
                  Collected this month: <strong>{formatCurrency(monthReceived)}</strong>
                </div>
                <div>
                  <span className={styles.redDot} />
                  Disbursed this month: <strong>{formatCurrency(monthPaid)}</strong>
                </div>
              </div>
            </section>

            <section className={styles.panel} id="stock">
              <div className={styles.panelHeader}>
                <div>
                  <h2>Stock snapshot</h2>
                  <p>Current inventory by material</p>
                </div>
                <a className={styles.textLink} href="/stock">
                  Manage stock <ArrowUpRight size={15} />
                </a>
              </div>

              {loading ? (
                <div className={styles.emptyDashboard}>Loading inventory...</div>
              ) : dashboard?.stock.length ? (
                <div className={styles.stockList}>
                  {dashboard.stock.map((item, index) => {
                    const itemQty = Number(item.currentStock) || 0;
                    const percent = Math.min((itemQty / maxStock) * 100, 100);
                    const color = colors[index % colors.length];
                    return (
                      <StockRow
                        key={item.id}
                        name={item.name}
                        value={formatQuantity(itemQty)}
                        percent={`${percent.toFixed(1)}%`}
                        color={color}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyDashboard}>No scrap stock recorded yet.</div>
              )}
            </section>
          </div>

          {/* Recent Activity Table */}
          <section className={styles.panel} id="companies">
            <div className={styles.panelHeader}>
              <div>
                <h2>Recent activity</h2>
                <p>Latest purchases, sales, and payments recorded across your desk</p>
              </div>
              <a className={styles.textLink} href="/reports">
                View all reports <ArrowUpRight size={15} />
              </a>
            </div>

            {loading ? (
              <div className={styles.emptyDashboard}>Loading recent activity...</div>
            ) : activities.length ? (
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Company / Party</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((act) => {
                      const isSale = act.type === "Sale";
                      const isPurchase = act.type === "Purchase";
                      const iconTone = isSale ? "sale" : isPurchase ? "purchase" : "payment";
                      const icon = isSale ? (
                        <ArrowUpRight size={15} />
                      ) : isPurchase ? (
                        <ArrowDownLeft size={15} />
                      ) : (
                        <CircleDollarSign size={15} />
                      );

                      return (
                        <ActivityRow
                          key={act.id}
                          icon={icon}
                          iconTone={iconTone}
                          type={act.type}
                          company={act.company}
                          date={act.date}
                          amount={act.amount}
                          status={act.status}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyDashboard}>
                No activity recorded yet. Start by buying or selling scrap.
              </div>
            )}
          </section>

          {/* Quick Actions Footer */}
          <div className={styles.quickActions}>
            <div>
              <p className={styles.eyebrow}>QUICK ACTIONS</p>
              <h2>Keep your desk moving</h2>
            </div>
            <div className={styles.actionButtons}>
              <a href="/quick-bill">
                <CircleDollarSign size={17} />
                Quick bill
              </a>
              <a href="/purchases">
                <ArrowDownLeft size={17} />
                Buy scrap
              </a>
              <a href="/sales">
                <Truck size={17} />
                Sell scrap
              </a>
              <a href="/payments">
                <CircleDollarSign size={17} />
                Payments
              </a>
              <a href="/reports">
                <FileText size={17} />
                Reports
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  trend,
  trendText,
  icon,
  tone,
  negative = false,
}: {
  label: string;
  value: string;
  suffix?: string;
  trend: string;
  trendText: string;
  icon: ReactNode;
  tone: string;
  negative?: boolean;
}) {
  return (
    <article className={styles.metricCard}>
      <div className={styles.metricTop}>
        <span>{label}</span>
        <div className={`${styles.metricIcon} ${styles[tone]}`}>{icon}</div>
      </div>
      <div className={styles.metricValue}>
        {value}
        {suffix && <small>{suffix}</small>}
      </div>
      <div className={`${styles.trend} ${negative ? styles.trendGood : ""}`}>
        <span>{trend}</span> {trendText}
      </div>
    </article>
  );
}

function BalanceRow({
  label,
  detail,
  amount,
  percentage,
  tone,
}: {
  label: string;
  detail: string;
  amount: string;
  percentage: string;
  tone: string;
}) {
  return (
    <div className={styles.balanceRow}>
      <div className={styles.balanceLabel}>
        <span className={`${styles.balanceIcon} ${styles[tone]}`}>
          {tone === "receive" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
        </span>
        <div>
          <strong>{label}</strong>
          <small>{detail}</small>
        </div>
      </div>
      <strong>{amount}</strong>
      <div className={styles.balanceBar}>
        <span className={styles[tone]} style={{ width: percentage }} />
      </div>
    </div>
  );
}

function StockRow({
  name,
  value,
  percent,
  color,
}: {
  name: string;
  value: string;
  percent: string;
  color: string;
}) {
  return (
    <div className={styles.stockRow}>
      <div className={styles.stockName}>
        <i className={`${styles.stockDot} ${styles[color]}`} />
        <strong>{name}</strong>
      </div>
      <strong>{value}</strong>
      <div className={styles.stockBar}>
        <span className={styles[color]} style={{ width: percent }} />
      </div>
    </div>
  );
}

function ActivityRow({
  icon,
  iconTone,
  type,
  company,
  date,
  amount,
  status,
}: {
  icon: ReactNode;
  iconTone: string;
  type: string;
  company: string;
  date: string;
  amount: string;
  status: string;
}) {
  return (
    <tr>
      <td>
        <span className={`${styles.activityIcon} ${styles[iconTone]}`}>{icon}</span>
        <strong>{type}</strong>
      </td>
      <td>{company}</td>
      <td className={styles.muted}>{date}</td>
      <td>
        <strong>{amount}</strong>
      </td>
      <td>
        <span
          className={`${styles.status} ${
            styles[
              status === "Completed" ? "complete" : status === "Payable" ? "payable" : "partial"
            ]
          }`}
        >
          {status}
        </span>
      </td>
    </tr>
  );
}
