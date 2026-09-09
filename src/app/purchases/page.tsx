import { DataPanel, FeaturePage, FormPanel, SummaryCards } from "@/components/FeaturePage";

export default function PurchasesPage() {
  return <FeaturePage active="/purchases" eyebrow="BUY SCRAP" title="Buy scrap" description="Record scrap purchased from suppliers and track what you still need to pay." actionLabel="New purchase" actionHref="#form">
    <SummaryCards cards={[{ label: "Purchases this month", value: "₹12.48L", note: "Across 18 purchases", tone: "amber" }, { label: "Quantity bought", value: "24,700 kg", note: "Added to stock", tone: "green" }, { label: "Paid to suppliers", value: "₹9.21L", note: "Paid so far", tone: "blue" }, { label: "Still to pay", value: "₹3.27L", note: "Payable amount", tone: "red" }]} />
    <DataPanel title="Recent purchases" subtitle="Every purchase increases your stock" rows={[{ title: "Shree Metals Pvt. Ltd. · Ferrous metal", subtitle: "09 Sep 2026 · 2,500 kg × ₹33.80", amount: "₹84,500", status: "₹20,000 payable", tone: "amber" }, { title: "Mahalaxmi Traders · Aluminium", subtitle: "06 Sep 2026 · 1,200 kg × ₹182", amount: "₹2,18,400", status: "Paid", tone: "green" }]} />
    <FormPanel title="Record a purchase" fields={["Supplier company", "Purchase date", "Scrap type", "Quantity", "Rate per unit", "Amount paid", "Notes"]} />
  </FeaturePage>;
}
