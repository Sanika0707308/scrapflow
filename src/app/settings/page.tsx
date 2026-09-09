import { FeaturePage, FormPanel } from "@/components/FeaturePage";

export default function SettingsPage() {
  return <FeaturePage active="/settings" eyebrow="WORKSPACE SETTINGS" title="Settings" description="Set the business details and preferences used across ScrapFlow.">
    <FormPanel title="Business details" fields={["Business name", "Owner name", "Mobile number", "Email", "Business address", "GST number", "Default currency", "Default unit"]} />
  </FeaturePage>;
}
