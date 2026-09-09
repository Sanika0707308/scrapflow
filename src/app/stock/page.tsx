import { DataPanel, FeaturePage, FormPanel, SummaryCards } from "@/components/FeaturePage";

export default function StockPage() {
  return <FeaturePage active="/stock" eyebrow="INVENTORY" title="Scrap stock" description="See how much material is available before you promise a delivery." actionLabel="Add scrap type" actionHref="#form">
    <SummaryCards cards={[{ label: "Available stock", value: "0 MT", note: "No stock added", tone: "green" }, { label: "Bought this month", value: "0 MT", note: "No purchases yet", tone: "amber" }, { label: "Sold this month", value: "0 MT", note: "No sales yet", tone: "blue" }, { label: "Low stock items", value: "0", note: "No scrap types yet", tone: "red" }]} />
    <DataPanel title="Stock by scrap type" subtitle="Commercial units: MT, kg, long ton, gross ton, or lb" rows={[]} emptyText="No scrap types added yet. Add a scrap type to start tracking stock." />
    <FormPanel title="Add a scrap type" fields={["Scrap name", "Category", "Unit", "Opening stock", "Notes"]} />
  </FeaturePage>;
}
