import { DataPanel, FeaturePage, FormPanel, SummaryCards } from "@/components/FeaturePage";

export default function CompaniesPage() {
  return <FeaturePage active="/companies" eyebrow="COMPANY DIRECTORY" title="Companies" description="Keep supplier and buyer details together in one place." actionLabel="Add company" actionHref="#form">
    <SummaryCards cards={[{ label: "All companies", value: "24", note: "12 suppliers · 18 buyers", tone: "green" }, { label: "Suppliers", value: "12", note: "Companies we buy from", tone: "amber" }, { label: "Buyers", value: "18", note: "Companies we sell to", tone: "blue" }, { label: "With outstanding", value: "9", note: "Need payment follow-up", tone: "red" }]} />
    <DataPanel title="Company list" subtitle="Search and open any company ledger" rows={[{ title: "Shree Metals Pvt. Ltd.", subtitle: "Supplier · Contact: Rajesh Sharma", amount: "₹84,500 payable", status: "Supplier", tone: "amber" }, { title: "GreenEarth Industries", subtitle: "Buyer · Contact: Neha Patel", amount: "₹1,26,800 to receive", status: "Buyer", tone: "green" }, { title: "Mahalaxmi Traders", subtitle: "Both · Contact: Amit Shah", amount: "Clear balance", status: "Both", tone: "blue" }]} />
    <FormPanel title="Add a company" fields={["Company name", "Contact person", "Mobile number", "Email", "GST number", "Address"]} />
  </FeaturePage>;
}
