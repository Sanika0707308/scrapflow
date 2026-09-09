import { DataPanel, FeaturePage, FormPanel, SummaryCards } from "@/components/FeaturePage";

export default function StockPage() {
  return <FeaturePage active="/stock" eyebrow="INVENTORY" title="Scrap stock" description="See how much material is available before you promise a delivery." actionLabel="Add scrap type" actionHref="#form">
    <SummaryCards cards={[{ label: "Available stock", value: "18.45 MT", note: "Current total", tone: "green" }, { label: "Bought this month", value: "24.70 MT", note: "Added to stock", tone: "amber" }, { label: "Sold this month", value: "18.25 MT", note: "Sent to buyers", tone: "blue" }, { label: "Low stock items", value: "2", note: "Need attention", tone: "red" }]} />
    <DataPanel title="Stock by scrap type" subtitle="Commercial units: MT, kg, long ton, gross ton, or lb" rows={[{ title: "Ferrous metal", subtitle: "Unit: Tonne (MT) · Last updated today", amount: "8.24 MT", status: "In stock", tone: "green" }, { title: "Aluminium", subtitle: "Unit: Tonne (MT) · Last updated yesterday", amount: "4.18 MT", status: "In stock", tone: "green" }, { title: "Copper wire", subtitle: "Unit: Kilogram (kg) · Last updated 07 Sep", amount: "2,960 kg", status: "In stock", tone: "blue" }, { title: "Paper & cardboard", subtitle: "Unit: Kilogram (kg) · Last updated 06 Sep", amount: "3,070 kg", status: "In stock", tone: "amber" }]} />
    <FormPanel title="Add a scrap type" fields={["Scrap name", "Category", "Unit", "Opening stock", "Notes"]} />
  </FeaturePage>;
}
