import { DataPanel, FeaturePage, FormPanel, SummaryCards } from "@/components/FeaturePage";

export default function CompaniesPage() {
  return <FeaturePage active="/companies" eyebrow="COMPANY DIRECTORY" title="Companies" description="Keep supplier and buyer details together in one place." actionLabel="Add company" actionHref="#form">
    <SummaryCards cards={[{ label: "All companies", value: "0", note: "Add your first company", tone: "green" }, { label: "Suppliers", value: "0", note: "Companies we buy from", tone: "amber" }, { label: "Buyers", value: "0", note: "Companies we sell to", tone: "blue" }, { label: "With outstanding", value: "0", note: "No pending follow-ups", tone: "red" }]} />
    <DataPanel title="Company list" subtitle="Your saved companies will appear here" allowDelete rows={[]} emptyText="No companies added yet. Use Add company to create your first supplier or buyer." />
    <FormPanel title="Add a company" fields={["Company name", "Contact person", "Mobile number", "Email", "GST number", "Address"]} />
  </FeaturePage>;
}
