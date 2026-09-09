import { DataPanel, FeaturePage } from "@/components/FeaturePage";

export default function ReportsPage() {
  return <FeaturePage active="/reports" eyebrow="BUSINESS REPORTS" title="Reports" description="Print or review clear reports for purchases, sales, payments, stock, and company balances.">
    <DataPanel title="Choose a report" subtitle="Select a report to review its details" rows={[{ title: "Purchase report", subtitle: "Purchases by date, supplier, scrap type, and amount", status: "Open report", tone: "amber" }, { title: "Sales report", subtitle: "Sales and deliveries by date, buyer, and amount", status: "Open report", tone: "blue" }, { title: "Payment report", subtitle: "Money paid and received with payment details", status: "Open report", tone: "green" }, { title: "Udhari / outstanding report", subtitle: "Company-wise money to receive and money to pay", status: "Open report", tone: "red" }, { title: "Stock report", subtitle: "Purchased, sold, and available quantity by scrap type", status: "Open report", tone: "green" }, { title: "Company ledger", subtitle: "Date-wise running balance for any company", status: "Open report", tone: "blue" }]} />
  </FeaturePage>;
}
