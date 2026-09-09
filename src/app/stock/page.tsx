import { DataPanel, FeaturePage, FormPanel, SummaryCards } from "@/components/FeaturePage";

export default function StockPage() {
  return <FeaturePage active="/stock" eyebrow="INVENTORY" title="Scrap stock" description="See how much material is available before you promise a delivery." actionLabel="Add scrap type" actionHref="#form">
    <SummaryCards cards={[{ label: "Available stock", value: "18,450 kg", note: "Current total", tone: "green" }, { label: "Bought this month", value: "24,700 kg", note: "Added to stock", tone: "amber" }, { label: "Sold this month", value: "18,250 kg", note: "Sent to buyers", tone: "blue" }, { label: "Low stock items", value: "2", note: "Need attention", tone: "red" }]} />
    <DataPanel title="Stock by scrap type" subtitle="Available quantity and unit" rows={[{ title: "Ferrous metal", subtitle: "Unit: kg · Last updated today", amount: "8,240 kg", status: "In stock", tone: "green" }, { title: "Aluminium", subtitle: "Unit: kg · Last updated yesterday", amount: "4,180 kg", status: "In stock", tone: "green" }, { title: "Copper wire", subtitle: "Unit: kg · Last updated 07 Sep", amount: "2,960 kg", status: "In stock", tone: "blue" }, { title: "Paper & cardboard", subtitle: "Unit: kg · Last updated 06 Sep", amount: "3,070 kg", status: "In stock", tone: "amber" }]} />
    <FormPanel title="Add a scrap type" fields={["Scrap name", "Category", "Unit", "Opening stock", "Notes"]} />
  </FeaturePage>;
}
