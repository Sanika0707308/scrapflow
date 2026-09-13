"use client";

import { useCallback, useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Building2,
  Calendar,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
} from "lucide-react";
import { FeaturePage, SummaryCards } from "@/components/FeaturePage";
import styles from "@/components/FeaturePage.module.css";
import { readBusinessProfile } from "@/lib/business-profile";
import { formatLineItem, formatQuantity } from "@/lib/quantity";

type ReportTab = "purchases" | "sales" | "payments" | "udhari" | "stock" | "companies";

type PurchaseItem = {
  id: string;
  purchaseDate: string;
  supplier: { id: string; name: string; mobile: string | null };
  items: Array<{
    id: string;
    quantity: string | number;
    rate: string | number;
    amount: string | number;
    scrapType: { name: string; unit: string };
  }>;
  totalAmount: string | number;
  amountPaid: string | number;
  outstandingAmount: string | number;
  status: "PAID" | "PARTIAL" | "UNPAID";
};

type SaleItem = {
  id: string;
  saleDate: string;
  buyer: { id: string; name: string; mobile: string | null };
  items: Array<{
    id: string;
    quantity: string | number;
    rate: string | number;
    amount: string | number;
    scrapType: { name: string; unit: string };
  }>;
  totalAmount: string | number;
  amountReceived: string | number;
  outstandingAmount: string | number;
  status: "PAID" | "PARTIAL" | "UNPAID";
};

type PaymentItem = {
  id: string;
  paymentDate: string;
  direction: "IN" | "OUT";
  amount: string | number;
  method: string | null;
  notes: string | null;
  company: { id: string; name: string; type: string };
  purchaseId?: string | null;
  saleId?: string | null;
};

type StockMovementItem = {
  id: string;
  occurredAt: string;
  type: string;
  quantity: string | number;
  balanceAfter: string | number;
  scrapType: { name: string; unit: string };
  purchase?: { id: string; totalAmount: string | number } | null;
  sale?: { id: string; totalAmount: string | number } | null;
};

type CompanyItem = {
  id: string;
  name: string;
  type: "SUPPLIER" | "BUYER" | "BOTH";
  mobile: string | null;
  payableBalance: string | number;
  receivableBalance: string | number;
  createdAt: string;
};

type ScrapTypeItem = {
  id: string;
  name: string;
  unit: string;
  currentStock: string | number;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("purchases");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Business profile for headers & exports
  const [businessName, setBusinessName] = useState("ScrapFlow Business");

  // Raw API datasets
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovementItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [scrapTypes, setScrapTypes] = useState<ScrapTypeItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const profile = readBusinessProfile();
    if (profile?.businessName) {
      setTimeout(() => {
        setBusinessName(profile.businessName);
      }, 0);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [purRes, salRes, payRes, movRes, comRes, stocRes] = await Promise.all([
        fetch("/api/purchases?take=200"),
        fetch("/api/sales?take=200"),
        fetch("/api/payments?take=200"),
        fetch("/api/stock/movements?take=200"),
        fetch("/api/companies"),
        fetch("/api/scrap-types"),
      ]);

      if (!purRes.ok) throw new Error("Failed to load purchases data");
      if (!salRes.ok) throw new Error("Failed to load sales data");
      if (!payRes.ok) throw new Error("Failed to load payments data");
      if (!movRes.ok) throw new Error("Failed to load stock movements data");
      if (!comRes.ok) throw new Error("Failed to load companies data");
      if (!stocRes.ok) throw new Error("Failed to load scrap inventory data");

      const [purData, salData, payData, movData, comData, stocData] = await Promise.all([
        purRes.json(),
        salRes.json(),
        payRes.json(),
        movRes.json(),
        comRes.json(),
        stocRes.json(),
      ]);

      setPurchases(purData);
      setSales(salData);
      setPayments(payData);
      setStockMovements(movData);
      setCompanies(comData);
      setScrapTypes(stocData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load report data";
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

  // Date range filter helper
  const matchesDate = (dateStr: string) => {
    if (!fromDate && !toDate) return true;
    const target = new Date(dateStr).setHours(0, 0, 0, 0);
    if (fromDate) {
      const from = new Date(fromDate).setHours(0, 0, 0, 0);
      if (target < from) return false;
    }
    if (toDate) {
      const to = new Date(toDate).setHours(23, 59, 59, 999);
      if (target > to) return false;
    }
    return true;
  };

  // Quick preset helper
  const applyPreset = (preset: "all" | "this-month" | "last-30" | "today") => {
    const now = new Date();
    if (preset === "all") {
      setFromDate("");
      setToDate("");
    } else if (preset === "this-month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(start.toISOString().split("T")[0]);
      setToDate(now.toISOString().split("T")[0]);
    } else if (preset === "last-30") {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      setFromDate(start.toISOString().split("T")[0]);
      setToDate(now.toISOString().split("T")[0]);
    } else if (preset === "today") {
      const today = now.toISOString().split("T")[0];
      setFromDate(today);
      setToDate(today);
    }
  };

  // Filtered Datasets
  const filteredPurchases = purchases.filter((p) => {
    const dateOk = matchesDate(p.purchaseDate);
    const searchOk =
      !searchQuery ||
      p.supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.items.some((i) => i.scrapType.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return dateOk && searchOk;
  });

  const filteredSales = sales.filter((s) => {
    const dateOk = matchesDate(s.saleDate);
    const searchOk =
      !searchQuery ||
      s.buyer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.items.some((i) => i.scrapType.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return dateOk && searchOk;
  });

  const filteredPayments = payments.filter((p) => {
    const dateOk = matchesDate(p.paymentDate);
    const searchOk =
      !searchQuery ||
      p.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.method && p.method.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return dateOk && searchOk;
  });

  const filteredMovements = stockMovements.filter((m) => {
    const dateOk = matchesDate(m.occurredAt);
    const searchOk =
      !searchQuery ||
      m.scrapType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.type.toLowerCase().includes(searchQuery.toLowerCase());
    return dateOk && searchOk;
  });

  const filteredCompanies = companies.filter((c) => {
    return (
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.mobile && c.mobile.includes(searchQuery))
    );
  });

  // Export to CSV Function
  const exportCsv = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    const dateTag = new Date().toISOString().split("T")[0];

    if (activeTab === "purchases") {
      headers = ["Date", "Supplier", "Material Items", "Total Amount (INR)", "Amount Paid (INR)", "Outstanding (INR)", "Status"];
      rows = filteredPurchases.map((p) => [
        new Date(p.purchaseDate).toLocaleDateString("en-IN"),
        p.supplier.name,
        p.items.map((i) => formatLineItem(i.quantity, i.amount, i.scrapType.name)).join("; "),
        Number(p.totalAmount),
        Number(p.amountPaid),
        Number(p.outstandingAmount),
        p.status,
      ]);
    } else if (activeTab === "sales") {
      headers = ["Date", "Buyer", "Material Items", "Total Amount (INR)", "Amount Received (INR)", "Outstanding (INR)", "Status"];
      rows = filteredSales.map((s) => [
        new Date(s.saleDate).toLocaleDateString("en-IN"),
        s.buyer.name,
        s.items.map((i) => formatLineItem(i.quantity, i.amount, i.scrapType.name)).join("; "),
        Number(s.totalAmount),
        Number(s.amountReceived),
        Number(s.outstandingAmount),
        s.status,
      ]);
    } else if (activeTab === "payments") {
      headers = ["Date", "Direction", "Company", "Amount (INR)", "Method", "Notes"];
      rows = filteredPayments.map((p) => [
        new Date(p.paymentDate).toLocaleDateString("en-IN"),
        p.direction === "IN" ? "Payment In (Buyer)" : "Payment Out (Supplier)",
        p.company.name,
        Number(p.amount),
        p.method || "Cash",
        p.notes || "",
      ]);
    } else if (activeTab === "udhari") {
      headers = ["Company", "Type", "Mobile", "Receivable Due (INR)", "Payable Owed (INR)", "Net Balance (INR)"];
      rows = filteredCompanies.map((c) => {
        const rec = Number(c.receivableBalance) || 0;
        const pay = Number(c.payableBalance) || 0;
        return [c.name, c.type, c.mobile || "N/A", rec, pay, rec - pay];
      });
    } else if (activeTab === "stock") {
      headers = ["Date", "Material", "Type", "Quantity Change", "Balance After"];
      rows = filteredMovements.map((m) => [
        new Date(m.occurredAt).toLocaleDateString("en-IN"),
        m.scrapType.name,
        m.type,
        formatQuantity(m.quantity),
        formatQuantity(m.balanceAfter),
      ]);
    } else {
      headers = ["Company", "Type", "Mobile", "Payable (INR)", "Receivable (INR)"];
      rows = filteredCompanies.map((c) => [c.name, c.type, c.mobile || "N/A", Number(c.payableBalance), Number(c.receivableBalance)]);
    }

    const escapeVal = (val: string | number) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const csvContent = [headers.map(escapeVal).join(","), ...rows.map((r) => r.map(escapeVal).join(","))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `scrapflow-${activeTab}-report-${dateTag}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export to PDF Function
  const exportPdf = () => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const now = new Date().toLocaleDateString("en-IN");

    pdf.setFontSize(16);
    pdf.setTextColor(27, 74, 64);
    pdf.text(businessName, 14, 15);

    pdf.setFontSize(11);
    pdf.setTextColor(80, 100, 95);
    pdf.text(`${activeTab.toUpperCase()} REPORT · Generated on ${now}`, 14, 22);
    if (fromDate || toDate) {
      pdf.setFontSize(9);
      pdf.text(`Date filter: ${fromDate || "Start"} to ${toDate || "Present"}`, 14, 27);
    }

    pdf.setDrawColor(200, 215, 210);
    pdf.line(14, 30, 196, 30);

    let y = 38;
    pdf.setFontSize(9);
    pdf.setTextColor(30, 60, 52);

    if (activeTab === "purchases") {
      pdf.setFont("helvetica", "bold");
      pdf.text("Date", 14, y);
      pdf.text("Supplier", 40, y);
      pdf.text("Amount (Rs)", 135, y, { align: "right" });
      pdf.text("Paid (Rs)", 165, y, { align: "right" });
      pdf.text("Status", 195, y, { align: "right" });
      pdf.setFont("helvetica", "normal");
      y += 6;

      filteredPurchases.slice(0, 30).forEach((p) => {
        if (y > 275) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(new Date(p.purchaseDate).toLocaleDateString("en-IN"), 14, y);
        pdf.text(p.supplier.name.slice(0, 35), 40, y);
        pdf.text(Number(p.totalAmount).toLocaleString("en-IN"), 135, y, { align: "right" });
        pdf.text(Number(p.amountPaid).toLocaleString("en-IN"), 165, y, { align: "right" });
        pdf.text(p.status, 195, y, { align: "right" });
        y += 6;
      });
    } else if (activeTab === "sales") {
      pdf.setFont("helvetica", "bold");
      pdf.text("Date", 14, y);
      pdf.text("Buyer", 40, y);
      pdf.text("Amount (Rs)", 135, y, { align: "right" });
      pdf.text("Received (Rs)", 165, y, { align: "right" });
      pdf.text("Status", 195, y, { align: "right" });
      pdf.setFont("helvetica", "normal");
      y += 6;

      filteredSales.slice(0, 30).forEach((s) => {
        if (y > 275) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(new Date(s.saleDate).toLocaleDateString("en-IN"), 14, y);
        pdf.text(s.buyer.name.slice(0, 35), 40, y);
        pdf.text(Number(s.totalAmount).toLocaleString("en-IN"), 135, y, { align: "right" });
        pdf.text(Number(s.amountReceived).toLocaleString("en-IN"), 165, y, { align: "right" });
        pdf.text(s.status, 195, y, { align: "right" });
        y += 6;
      });
    } else if (activeTab === "payments") {
      pdf.setFont("helvetica", "bold");
      pdf.text("Date", 14, y);
      pdf.text("Direction", 40, y);
      pdf.text("Party", 80, y);
      pdf.text("Method", 145, y);
      pdf.text("Amount (Rs)", 195, y, { align: "right" });
      pdf.setFont("helvetica", "normal");
      y += 6;

      filteredPayments.slice(0, 30).forEach((pay) => {
        if (y > 275) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(new Date(pay.paymentDate).toLocaleDateString("en-IN"), 14, y);
        pdf.text(pay.direction === "IN" ? "Payment IN" : "Payment OUT", 40, y);
        pdf.text(pay.company.name.slice(0, 28), 80, y);
        pdf.text(pay.method || "Cash", 145, y);
        pdf.text(Number(pay.amount).toLocaleString("en-IN"), 195, y, { align: "right" });
        y += 6;
      });
    } else {
      pdf.setFont("helvetica", "bold");
      pdf.text("Party Name", 14, y);
      pdf.text("Type", 95, y);
      pdf.text("Receivable (Rs)", 150, y, { align: "right" });
      pdf.text("Payable (Rs)", 195, y, { align: "right" });
      pdf.setFont("helvetica", "normal");
      y += 6;

      filteredCompanies.slice(0, 30).forEach((c) => {
        if (y > 275) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(c.name.slice(0, 40), 14, y);
        pdf.text(c.type, 95, y);
        pdf.text(Number(c.receivableBalance).toLocaleString("en-IN"), 150, y, { align: "right" });
        pdf.text(Number(c.payableBalance).toLocaleString("en-IN"), 195, y, { align: "right" });
        y += 6;
      });
    }

    pdf.save(`scrapflow-${activeTab}-report-${now.replace(/\//g, "-")}.pdf`);
  };

  // Dynamic KPI Cards for the active view
  const renderKpiCards = () => {
    if (activeTab === "purchases") {
      const totalPur = filteredPurchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
      const totalPaid = filteredPurchases.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
      const totalDue = filteredPurchases.reduce((sum, p) => sum + (Number(p.outstandingAmount) || 0), 0);
      return (
        <SummaryCards
          cards={[
            { label: "Total purchases", value: formatCurrency(totalPur), note: `${filteredPurchases.length} purchase bills`, tone: "amber" },
            { label: "Amount paid", value: formatCurrency(totalPaid), note: "Disbursed to suppliers", tone: "blue" },
            { label: "Balance payable", value: formatCurrency(totalDue), note: totalDue > 0 ? "Pending supplier udhari" : "All cleared", tone: "red" },
            { label: "Bills count", value: String(filteredPurchases.length), note: "Filtered records", tone: "green" },
          ]}
        />
      );
    }
    if (activeTab === "sales") {
      const totalSal = filteredSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
      const totalRec = filteredSales.reduce((sum, s) => sum + (Number(s.amountReceived) || 0), 0);
      const totalDue = filteredSales.reduce((sum, s) => sum + (Number(s.outstandingAmount) || 0), 0);
      return (
        <SummaryCards
          cards={[
            { label: "Total sales", value: formatCurrency(totalSal), note: `${filteredSales.length} sale deliveries`, tone: "blue" },
            { label: "Amount received", value: formatCurrency(totalRec), note: "Collected from buyers", tone: "green" },
            { label: "Balance receivable", value: formatCurrency(totalDue), note: totalDue > 0 ? "Pending customer udhari" : "All collected", tone: "red" },
            { label: "Sales count", value: String(filteredSales.length), note: "Filtered records", tone: "amber" },
          ]}
        />
      );
    }
    if (activeTab === "payments") {
      const inPayments = filteredPayments.filter((p) => p.direction === "IN");
      const outPayments = filteredPayments.filter((p) => p.direction === "OUT");
      const totalIn = inPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const totalOut = outPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const netCash = totalIn - totalOut;
      return (
        <SummaryCards
          cards={[
            { label: "Payment in (Receipts)", value: formatCurrency(totalIn), note: `${inPayments.length} buyer receipts`, tone: "green" },
            { label: "Payment out (Payouts)", value: formatCurrency(totalOut), note: `${outPayments.length} supplier payouts`, tone: "amber" },
            { label: "Net cash flow", value: `${netCash >= 0 ? "+" : ""}${formatCurrency(netCash)}`, note: netCash >= 0 ? "Positive cash movement" : "Net payout", tone: netCash >= 0 ? "blue" : "red" },
            { label: "Total entries", value: String(filteredPayments.length), note: "Payment register entries", tone: "blue" },
          ]}
        />
      );
    }
    if (activeTab === "udhari") {
      const rec = companies.reduce((sum, c) => sum + (Number(c.receivableBalance) || 0), 0);
      const pay = companies.reduce((sum, c) => sum + (Number(c.payableBalance) || 0), 0);
      const net = rec - pay;
      const pendingCount = companies.filter((c) => Number(c.receivableBalance) > 0 || Number(c.payableBalance) > 0).length;
      return (
        <SummaryCards
          cards={[
            { label: "Money to receive", value: formatCurrency(rec), note: "Across buyer accounts", tone: "green" },
            { label: "Money to pay", value: formatCurrency(pay), note: "Across supplier accounts", tone: "amber" },
            { label: "Net position", value: `${net >= 0 ? "+" : ""}${formatCurrency(net)}`, note: net >= 0 ? "Net positive market position" : "Net payable position", tone: net >= 0 ? "blue" : "red" },
            { label: "Accounts pending", value: String(pendingCount), note: "Companies with open balance", tone: "red" },
          ]}
        />
      );
    }
    if (activeTab === "stock") {
      const totalStock = scrapTypes.reduce((sum, s) => sum + (Number(s.currentStock) || 0), 0);
      return (
        <SummaryCards
          cards={[
            { label: "Total yard stock", value: formatQuantity(totalStock), note: `${scrapTypes.length} catalog materials`, tone: "green" },
            { label: "Stock movements", value: String(filteredMovements.length), note: "Transactions in date range", tone: "blue" },
            { label: "Materials active", value: String(scrapTypes.length), note: "Inventory catalog items", tone: "amber" },
            { label: "Status", value: "Real-time", note: "Synced with PostgreSQL", tone: "green" },
          ]}
        />
      );
    }
    // companies
    const suppCount = companies.filter((c) => c.type === "SUPPLIER").length;
    const buyCount = companies.filter((c) => c.type === "BUYER").length;
    const bothCount = companies.filter((c) => c.type === "BOTH").length;
    return (
      <SummaryCards
        cards={[
          { label: "Total companies", value: String(companies.length), note: "Master business partners", tone: "blue" },
          { label: "Suppliers", value: String(suppCount), note: "Material vendors", tone: "amber" },
          { label: "Buyers", value: String(buyCount), note: "Foundries & traders", tone: "green" },
          { label: "Dual partners", value: String(bothCount), note: "Supplier & Buyer both", tone: "blue" },
        ]}
      />
    );
  };

  return (
    <FeaturePage
      active="/reports"
      eyebrow="BUSINESS REPORTS"
      title="Reports"
      description="Print or review clear reports for purchases, sales, payments, stock, and company balances."
    >
      {/* Report Type Navigation Tabs */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "16px",
          paddingBottom: "8px",
          borderBottom: "1px solid #e4ebe8",
        }}
      >
        {[
          { id: "purchases", label: "Purchase report", icon: ArrowDownLeft, tone: "#ae762b" },
          { id: "sales", label: "Sales report", icon: ArrowUpRight, tone: "#477598" },
          { id: "payments", label: "Payment report", icon: CircleDollarSign, tone: "#39816b" },
          { id: "udhari", label: "Udhari / Outstanding", icon: Building2, tone: "#b45e4d" },
          { id: "stock", label: "Stock report", icon: Boxes, tone: "#287066" },
          { id: "companies", label: "Company register", icon: Building2, tone: "#45665d" },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ReportTab)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                padding: "9px 14px",
                minHeight: "44px",
                flex: "1 1 140px",
                borderRadius: "6px",
                border: isActive ? `2px solid ${tab.tone}` : "1px solid #dfe8e4",
                background: isActive ? "#fff" : "#fafcfb",
                color: isActive ? tab.tone : "#536763",
                fontSize: "12px",
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Date Range Filters & Action Toolbar */}
      <section
        className={styles.panel}
        style={{ marginTop: "0", marginBottom: "16px", padding: "16px 20px" }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
          }}
        >
          {/* Left: Quick Date Presets */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", color: "#788984", fontWeight: 700, marginRight: "4px" }}>
              <Calendar size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
              Range:
            </span>
            <button
              type="button"
              onClick={() => applyPreset("all")}
              style={{
                padding: "5px 10px",
                borderRadius: "5px",
                border: "1px solid #dfe8e4",
                background: !fromDate && !toDate ? "#123c37" : "#fff",
                color: !fromDate && !toDate ? "#fff" : "#536763",
                fontSize: "11px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => applyPreset("this-month")}
              style={{
                padding: "5px 10px",
                borderRadius: "5px",
                border: "1px solid #dfe8e4",
                background: "#fff",
                color: "#536763",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => applyPreset("last-30")}
              style={{
                padding: "5px 10px",
                borderRadius: "5px",
                border: "1px solid #dfe8e4",
                background: "#fff",
                color: "#536763",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset("today")}
              style={{
                padding: "5px 10px",
                borderRadius: "5px",
                border: "1px solid #dfe8e4",
                background: "#fff",
                color: "#536763",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              Today
            </button>
          </div>

          {/* Center: Custom Date Pickers */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <label style={{ fontSize: "11px", color: "#788984" }}>From:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                padding: "6px 8px",
                minHeight: "38px",
                borderRadius: "5px",
                border: "1px solid #dfe8e4",
                fontSize: "12px",
                background: "#fff",
                outline: "none",
              }}
            />
            <label style={{ fontSize: "11px", color: "#788984" }}>To:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                padding: "6px 8px",
                minHeight: "38px",
                borderRadius: "5px",
                border: "1px solid #dfe8e4",
                fontSize: "12px",
                background: "#fff",
                outline: "none",
              }}
            />
          </div>

          {/* Right: Search & Export Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              style={{ width: "130px", minHeight: "38px" }}
            />
            <button
              type="button"
              onClick={exportCsv}
              title="Download Excel CSV file"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "7px 11px",
                minHeight: "38px",
                borderRadius: "6px",
                border: "1px solid #1e9c62",
                background: "#edf8f3",
                color: "#1e9c62",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <FileSpreadsheet size={14} /> CSV
            </button>
            <button
              type="button"
              onClick={exportPdf}
              title="Download Printable PDF"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "7px 11px",
                minHeight: "38px",
                borderRadius: "6px",
                border: "1px solid #b45e4d",
                background: "#fff8f6",
                color: "#b45e4d",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Download size={14} /> PDF
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              title="Print this report"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "7px 10px",
                minHeight: "38px",
                borderRadius: "6px",
                border: "1px solid #dfe8e4",
                background: "#fff",
                color: "#536763",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              <Printer size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* Dynamic Summary Cards */}
      {renderKpiCards()}

      {/* Main Report Table Section */}
      <section className={styles.panel} style={{ marginTop: "14px" }}>
        <div className={styles.panelHeader}>
          <div>
            <h2 style={{ textTransform: "capitalize" }}>
              {activeTab === "purchases"
                ? "Purchases Register Report"
                : activeTab === "sales"
                  ? "Sales & Deliveries Report"
                  : activeTab === "payments"
                    ? "Cash & Bank Payments Register"
                    : activeTab === "udhari"
                      ? "Outstanding & Udhari Balances"
                      : activeTab === "stock"
                        ? "Inventory Movements & Stock Report"
                        : "Company Directory & Master Ledger"}
            </h2>
            <p>
              {fromDate || toDate
                ? `Showing records filtered between ${fromDate || "beginning"} and ${toDate || "today"}`
                : "Showing all records synced live from PostgreSQL database"}
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            title="Refresh live data"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "6px 10px",
              border: "1px solid #dfe8e4",
              borderRadius: "5px",
              background: "#fff",
              color: "#536763",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {error && <p className={styles.errorMessage} style={{ margin: "14px 0" }}>{error}</p>}

        {loading ? (
          <p className={styles.empty} style={{ padding: "40px 0" }}>
            Loading report data from database...
          </p>
        ) : (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginTop: "16px" }}>
            {/* 1. PURCHASES REPORT TABLE */}
            {activeTab === "purchases" && (
              <table style={{ width: "100%", minWidth: "680px", borderCollapse: "collapse", fontSize: "12px", color: "#385850" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #edf1f0", textAlign: "left", color: "#788984", fontSize: "11px", textTransform: "uppercase" }}>
                    <th style={{ padding: "10px 12px" }}>Date</th>
                    <th style={{ padding: "10px 12px" }}>Supplier</th>
                    <th style={{ padding: "10px 12px" }}>Items / Scrap</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Bill Total</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Paid</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Outstanding</th>
                    <th style={{ padding: "10px 12px", textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={styles.empty} style={{ textAlign: "center", padding: "30px" }}>
                        No purchases found matching the selected date range or search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((p) => {
                      const dateStr = new Date(p.purchaseDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                      const itemsStr = p.items.map((i) => formatLineItem(i.quantity, i.amount, i.scrapType.name)).join(", ");
                      const totalAmt = Number(p.totalAmount) || 0;
                      const paidAmt = Number(p.amountPaid) || 0;
                      const dueAmt = Number(p.outstandingAmount) || 0;

                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid #edf1f0" }}>
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{dateStr}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <strong>{p.supplier.name}</strong>
                            {p.supplier.mobile && <small style={{ display: "block", color: "#8b9b95", fontSize: "10px" }}>{p.supplier.mobile}</small>}
                          </td>
                          <td style={{ padding: "10px 12px" }}>{itemsStr}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>{formatCurrency(totalAmt)}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#39816b" }}>{formatCurrency(paidAmt)}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: dueAmt > 0 ? "#b45e4d" : "#39816b", fontWeight: dueAmt > 0 ? 700 : 400 }}>
                            {formatCurrency(dueAmt)}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            <span className={`${styles.status} ${p.status === "PAID" ? styles.green : p.status === "PARTIAL" ? styles.amber : styles.red}`}>
                              {p.status === "PAID" ? "Fully Paid" : p.status === "PARTIAL" ? "Partial" : "Unpaid"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* 2. SALES REPORT TABLE */}
            {activeTab === "sales" && (
              <table style={{ width: "100%", minWidth: "680px", borderCollapse: "collapse", fontSize: "12px", color: "#385850" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #edf1f0", textAlign: "left", color: "#788984", fontSize: "11px", textTransform: "uppercase" }}>
                    <th style={{ padding: "10px 12px" }}>Date</th>
                    <th style={{ padding: "10px 12px" }}>Buyer</th>
                    <th style={{ padding: "10px 12px" }}>Items / Scrap</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Sale Total</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Received</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Outstanding</th>
                    <th style={{ padding: "10px 12px", textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={styles.empty} style={{ textAlign: "center", padding: "30px" }}>
                        No sales found matching the selected date range or search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((s) => {
                      const dateStr = new Date(s.saleDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                      const itemsStr = s.items.map((i) => formatLineItem(i.quantity, i.amount, i.scrapType.name)).join(", ");
                      const totalAmt = Number(s.totalAmount) || 0;
                      const recAmt = Number(s.amountReceived) || 0;
                      const dueAmt = Number(s.outstandingAmount) || 0;

                      return (
                        <tr key={s.id} style={{ borderBottom: "1px solid #edf1f0" }}>
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{dateStr}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <strong>{s.buyer.name}</strong>
                            {s.buyer.mobile && <small style={{ display: "block", color: "#8b9b95", fontSize: "10px" }}>{s.buyer.mobile}</small>}
                          </td>
                          <td style={{ padding: "10px 12px" }}>{itemsStr}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>{formatCurrency(totalAmt)}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#39816b" }}>{formatCurrency(recAmt)}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: dueAmt > 0 ? "#b45e4d" : "#39816b", fontWeight: dueAmt > 0 ? 700 : 400 }}>
                            {formatCurrency(dueAmt)}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            <span className={`${styles.status} ${s.status === "PAID" ? styles.green : s.status === "PARTIAL" ? styles.amber : styles.blue}`}>
                              {s.status === "PAID" ? "Fully Collected" : s.status === "PARTIAL" ? "Partial" : "Unpaid"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* 3. PAYMENTS REPORT TABLE */}
            {activeTab === "payments" && (
              <table style={{ width: "100%", minWidth: "680px", borderCollapse: "collapse", fontSize: "12px", color: "#385850" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #edf1f0", textAlign: "left", color: "#788984", fontSize: "11px", textTransform: "uppercase" }}>
                    <th style={{ padding: "10px 12px" }}>Date</th>
                    <th style={{ padding: "10px 12px" }}>Direction</th>
                    <th style={{ padding: "10px 12px" }}>Company / Party</th>
                    <th style={{ padding: "10px 12px" }}>Method</th>
                    <th style={{ padding: "10px 12px" }}>Notes / Ref</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={styles.empty} style={{ textAlign: "center", padding: "30px" }}>
                        No payments found matching the selected date range or search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => {
                      const dateStr = new Date(p.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                      const isInc = p.direction === "IN";
                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid #edf1f0" }}>
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{dateStr}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span className={`${styles.status} ${isInc ? styles.green : styles.amber}`}>
                              {isInc ? "Payment IN" : "Payment OUT"}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <strong>{p.company.name}</strong>
                          </td>
                          <td style={{ padding: "10px 12px" }}>{p.method || "Cash"}</td>
                          <td style={{ padding: "10px 12px" }}>{p.notes || "—"}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: isInc ? "#39816b" : "#ae762b" }}>
                            {isInc ? "+" : "-"}{formatCurrency(Number(p.amount) || 0)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* 4. UDHARI / OUTSTANDING REPORT TABLE */}
            {activeTab === "udhari" && (
              <table style={{ width: "100%", minWidth: "680px", borderCollapse: "collapse", fontSize: "12px", color: "#385850" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #edf1f0", textAlign: "left", color: "#788984", fontSize: "11px", textTransform: "uppercase" }}>
                    <th style={{ padding: "10px 12px" }}>Company</th>
                    <th style={{ padding: "10px 12px" }}>Type</th>
                    <th style={{ padding: "10px 12px" }}>Mobile</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Money to Receive (Due)</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Money to Pay (Owed)</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Net Position</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={styles.empty} style={{ textAlign: "center", padding: "30px" }}>
                        No companies found.
                      </td>
                    </tr>
                  ) : (
                    filteredCompanies.map((c) => {
                      const rec = Number(c.receivableBalance) || 0;
                      const pay = Number(c.payableBalance) || 0;
                      const net = rec - pay;
                      return (
                        <tr key={c.id} style={{ borderBottom: "1px solid #edf1f0" }}>
                          <td style={{ padding: "10px 12px" }}>
                            <strong>{c.name}</strong>
                          </td>
                          <td style={{ padding: "10px 12px" }}>{c.type}</td>
                          <td style={{ padding: "10px 12px" }}>{c.mobile || "—"}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: rec > 0 ? "#39816b" : "#9aa7a3", fontWeight: rec > 0 ? 700 : 400 }}>
                            {formatCurrency(rec)}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: pay > 0 ? "#b45e4d" : "#9aa7a3", fontWeight: pay > 0 ? 700 : 400 }}>
                            {formatCurrency(pay)}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: net > 0 ? "#39816b" : net < 0 ? "#b45e4d" : "#788984" }}>
                            {net > 0 ? `+${formatCurrency(net)}` : formatCurrency(net)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* 5. STOCK MOVEMENTS REPORT TABLE */}
            {activeTab === "stock" && (
              <table style={{ width: "100%", minWidth: "680px", borderCollapse: "collapse", fontSize: "12px", color: "#385850" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #edf1f0", textAlign: "left", color: "#788984", fontSize: "11px", textTransform: "uppercase" }}>
                    <th style={{ padding: "10px 12px" }}>Date</th>
                    <th style={{ padding: "10px 12px" }}>Scrap Material</th>
                    <th style={{ padding: "10px 12px" }}>Movement Type</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Quantity Change</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Balance After</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.empty} style={{ textAlign: "center", padding: "30px" }}>
                        No stock movements found matching the selected date range.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((m) => {
                      const dateStr = new Date(m.occurredAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                      const qty = Number(m.quantity) || 0;
                      const bal = Number(m.balanceAfter) || 0;
                      const isPositive = qty > 0;

                      return (
                        <tr key={m.id} style={{ borderBottom: "1px solid #edf1f0" }}>
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{dateStr}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <strong>{m.scrapType.name}</strong>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span className={`${styles.status} ${isPositive ? styles.green : styles.amber}`}>
                              {m.type}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: isPositive ? "#39816b" : "#b45e4d" }}>
                            {isPositive ? `+${formatQuantity(qty)}` : formatQuantity(qty)}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>
                            {formatQuantity(bal)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* 6. COMPANY REGISTER TABLE */}
            {activeTab === "companies" && (
              <table style={{ width: "100%", minWidth: "680px", borderCollapse: "collapse", fontSize: "12px", color: "#385850" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #edf1f0", textAlign: "left", color: "#788984", fontSize: "11px", textTransform: "uppercase" }}>
                    <th style={{ padding: "10px 12px" }}>Company Name</th>
                    <th style={{ padding: "10px 12px" }}>Type</th>
                    <th style={{ padding: "10px 12px" }}>Mobile</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Payable Balance</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Receivable Balance</th>
                    <th style={{ padding: "10px 12px", textAlign: "center" }}>Account Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={styles.empty} style={{ textAlign: "center", padding: "30px" }}>
                        No companies found.
                      </td>
                    </tr>
                  ) : (
                    filteredCompanies.map((c) => {
                      const pay = Number(c.payableBalance) || 0;
                      const rec = Number(c.receivableBalance) || 0;
                      const isClear = pay === 0 && rec === 0;

                      return (
                        <tr key={c.id} style={{ borderBottom: "1px solid #edf1f0" }}>
                          <td style={{ padding: "10px 12px" }}>
                            <strong>{c.name}</strong>
                          </td>
                          <td style={{ padding: "10px 12px" }}>{c.type}</td>
                          <td style={{ padding: "10px 12px" }}>{c.mobile || "—"}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: pay > 0 ? "#b45e4d" : "#8b9b95" }}>
                            {formatCurrency(pay)}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: rec > 0 ? "#39816b" : "#8b9b95" }}>
                            {formatCurrency(rec)}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            <span className={`${styles.status} ${isClear ? styles.green : styles.amber}`}>
                              {isClear ? "Clear" : "Open Balance"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>
    </FeaturePage>
  );
}

