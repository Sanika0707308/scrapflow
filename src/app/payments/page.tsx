import { DataPanel, FeaturePage, FormPanel, SummaryCards } from "@/components/FeaturePage";

export default function PaymentsPage() {
  return <FeaturePage active="/payments" eyebrow="MONEY MOVEMENT" title="Payments" description="Record money paid to suppliers and money received from buyers." actionLabel="Record payment" actionHref="#form">
    <SummaryCards cards={[{ label: "Received this month", value: "₹0.00", note: "No buyer payments", tone: "green" }, { label: "Paid this month", value: "₹0.00", note: "No supplier payments", tone: "amber" }, { label: "Payments recorded", value: "0", note: "No payments yet", tone: "blue" }, { label: "Pending follow-ups", value: "0", note: "No outstanding companies", tone: "red" }]} />
    <DataPanel title="Payment history" subtitle="Partial payments are supported" rows={[]} emptyText="No payments recorded yet. Payments will appear here after a purchase or sale." />
    <FormPanel title="Record a payment" fields={["Company", "Payment type", "Payment date", "Amount", "Against purchase or sale", "Payment method", "Notes"]} />
  </FeaturePage>;
}
