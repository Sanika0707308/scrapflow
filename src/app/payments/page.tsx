import { DataPanel, FeaturePage, FormPanel, SummaryCards } from "@/components/FeaturePage";

export default function PaymentsPage() {
  return <FeaturePage active="/payments" eyebrow="MONEY MOVEMENT" title="Payments" description="Record money paid to suppliers and money received from buyers." actionLabel="Record payment" actionHref="#form">
    <SummaryCards cards={[{ label: "Received this month", value: "₹12.46L", note: "From buyers", tone: "green" }, { label: "Paid this month", value: "₹9.21L", note: "To suppliers", tone: "amber" }, { label: "Payments recorded", value: "32", note: "This month", tone: "blue" }, { label: "Pending follow-ups", value: "9", note: "Outstanding companies", tone: "red" }]} />
    <DataPanel title="Payment history" subtitle="Partial payments are supported" rows={[{ title: "Payment received · GreenEarth Industries", subtitle: "09 Sep 2026 · Against sale SO-1042", amount: "₹50,000", status: "Received", tone: "green" }, { title: "Payment made · Shree Metals Pvt. Ltd.", subtitle: "08 Sep 2026 · Against purchase PO-1018", amount: "₹30,000", status: "Paid", tone: "amber" }, { title: "Payment received · Mahalaxmi Traders", subtitle: "07 Sep 2026 · Against sale SO-1039", amount: "₹52,000", status: "Received", tone: "blue" }]} />
    <FormPanel title="Record a payment" fields={["Company", "Payment type", "Payment date", "Amount", "Against purchase or sale", "Payment method", "Notes"]} />
  </FeaturePage>;
}
