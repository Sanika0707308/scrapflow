import { DataPanel, FeaturePage, SummaryCards } from "@/components/FeaturePage";

export default function UdhariPage() {
  return <FeaturePage active="/udhari" eyebrow="OUTSTANDING MONEY" title="Udhari / Outstanding" description="See who has to pay you, who you have to pay, and follow up without losing track." actionLabel="Record payment" actionHref="/payments#form">
    <SummaryCards cards={[{ label: "Money to receive", value: "₹0.00", note: "No buyer udhari", tone: "green" }, { label: "Money to pay", value: "₹0.00", note: "No supplier payable", tone: "amber" }, { label: "Total outstanding", value: "₹0.00", note: "No outstanding balance", tone: "red" }, { label: "Companies pending", value: "0", note: "No follow-up needed", tone: "blue" }]} />
    <DataPanel title="Money to receive from buyers" subtitle="Follow up on sales where full payment is pending" rows={[]} emptyText="No buyer outstanding amounts yet." />
    <DataPanel title="Money to pay suppliers" subtitle="Payments still pending for purchased scrap" rows={[]} emptyText="No supplier payable amounts yet." />
  </FeaturePage>;
}
