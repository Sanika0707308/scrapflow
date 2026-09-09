import { DataPanel, FeaturePage, FormPanel, SummaryCards } from "@/components/FeaturePage";

export default function SalesPage() {
  return <FeaturePage active="/sales" eyebrow="SELL SCRAP" title="Sell scrap" description="Create deliveries, reduce stock automatically, and see what buyers still owe you." actionLabel="New sale" actionHref="#form">
    <SummaryCards cards={[{ label: "Sales this month", value: "₹16.82L", note: "Across 14 deliveries", tone: "blue" }, { label: "Quantity sold", value: "18,250 kg", note: "Removed from stock", tone: "green" }, { label: "Received from buyers", value: "₹12.46L", note: "Received so far", tone: "amber" }, { label: "Still to receive", value: "₹4.36L", note: "Udhari amount", tone: "red" }]} />
    <DataPanel title="Recent sales and deliveries" subtitle="A sale cannot be higher than available stock" rows={[{ title: "GreenEarth Industries · Ferrous metal", subtitle: "08 Sep 2026 · 3,200 kg × ₹39.63", amount: "₹1,26,800", status: "₹30,000 to receive", tone: "red" }, { title: "Mahalaxmi Traders · Copper wire", subtitle: "04 Sep 2026 · 850 kg × ₹612", amount: "₹5,20,200", status: "Received", tone: "green" }]} />
    <FormPanel title="Create a sale or delivery" fields={["Buyer company", "Sale date", "Scrap type", "Quantity", "Rate per unit", "Amount received", "Notes"]} />
  </FeaturePage>;
}
