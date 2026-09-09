import { BusinessProfileForm, FeaturePage } from "@/components/FeaturePage";

export default function SettingsPage() {
  return <FeaturePage active="/settings" eyebrow="WORKSPACE SETTINGS" title="Settings" description="Enter your own business details so bills and messages show the correct name.">
    <BusinessProfileForm />
  </FeaturePage>;
}
