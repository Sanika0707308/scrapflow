import { DataPanel, FeaturePage, FormPanel, SummaryCards } from "@/components/FeaturePage";

export default function SalesPage() {
  return <FeaturePage active="/sales" eyebrow="SELL SCRAP" title="Sell scrap" description="Create deliveries, reduce stock automatically, and see what buyers still owe you." actionLabel="New sale" actionHref="#form">
    <SummaryCards cards={[{ label: "Sales this month", value: "₹0.00", note: "No sales yet", tone: "blue" }, { label: "Quantity sold", value: "0 MT", note: "Nothing delivered", tone: "green" }, { label: "Received from buyers", value: "₹0.00", note: "No payments yet", tone: "amber" }, { label: "Still to receive", value: "₹0.00", note: "No udhari amount", tone: "red" }]} />
    <DataPanel title="Recent sales and deliveries" subtitle="A sale cannot be higher than available stock" rows={[]} emptyText="No sales recorded yet. Add stock before creating a sale or delivery." />
    <FormPanel title="Create a sale or delivery" fields={["Buyer company", "Sale date", "Scrap type", "Quantity", "Rate per unit", "Amount received", "Notes"]} />
  </FeaturePage>;
}
