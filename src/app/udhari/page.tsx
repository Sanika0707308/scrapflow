import { DataPanel, FeaturePage, SummaryCards } from "@/components/FeaturePage";

export default function UdhariPage() {
  return <FeaturePage active="/udhari" eyebrow="OUTSTANDING MONEY" title="Udhari / Outstanding" description="See who has to pay you, who you have to pay, and follow up without losing track." actionLabel="Record payment" actionHref="/payments#form">
    <SummaryCards cards={[{ label: "Money to receive", value: "₹6,82,400", note: "Buyer udhari", tone: "green" }, { label: "Money to pay", value: "₹2,46,850", note: "Supplier payable", tone: "amber" }, { label: "Total outstanding", value: "₹4,35,550", note: "Net balance", tone: "red" }, { label: "Companies pending", value: "9", note: "Need follow-up", tone: "blue" }]} />
    <DataPanel title="Money to receive from buyers" subtitle="Follow up on sales where full payment is pending" rows={[{ title: "GreenEarth Industries", subtitle: "Sale on 08 Sep 2026 · Total ₹1,26,800", amount: "₹30,000", status: "To receive", tone: "red" }, { title: "Mahalaxmi Traders", subtitle: "Sale on 04 Sep 2026 · Total ₹5,20,200", amount: "₹18,400", status: "To receive", tone: "amber" }]} />
    <DataPanel title="Money to pay suppliers" subtitle="Payments still pending for purchased scrap" rows={[{ title: "Shree Metals Pvt. Ltd.", subtitle: "Purchase on 09 Sep 2026 · Total ₹84,500", amount: "₹20,000", status: "To pay", tone: "amber" }, { title: "Ravi Recycling Co.", subtitle: "Purchase on 02 Sep 2026 · Total ₹1,08,000", amount: "₹15,000", status: "To pay", tone: "red" }]} />
  </FeaturePage>;
}
