import { DataPanel, FeaturePage, FormPanel, SummaryCards } from "@/components/FeaturePage";

export default function PurchasesPage() {
  return <FeaturePage active="/purchases" eyebrow="BUY SCRAP" title="Buy scrap" description="Record scrap purchased from suppliers and track what you still need to pay." actionLabel="New purchase" actionHref="#form">
    <SummaryCards cards={[{ label: "Purchases this month", value: "₹0.00", note: "No purchases yet", tone: "amber" }, { label: "Quantity bought", value: "0 MT", note: "Nothing added", tone: "green" }, { label: "Paid to suppliers", value: "₹0.00", note: "No payments yet", tone: "blue" }, { label: "Still to pay", value: "₹0.00", note: "No payable amount", tone: "red" }]} />
    <DataPanel title="Recent purchases" subtitle="Every purchase increases your stock" rows={[]} emptyText="No purchases recorded yet. Add a company and scrap type before recording a purchase." />
    <FormPanel title="Record a purchase" fields={["Supplier company", "Purchase date", "Scrap type", "Quantity", "Rate per unit", "Amount paid", "Notes"]} />
  </FeaturePage>;
}
