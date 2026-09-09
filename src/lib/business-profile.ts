export type BusinessProfile = {
  businessName: string;
  ownerName: string;
  mobile: string;
  email: string;
  address: string;
  gst: string;
};

export const emptyBusinessProfile: BusinessProfile = {
  businessName: "",
  ownerName: "",
  mobile: "",
  email: "",
  address: "",
  gst: "",
};

export function readBusinessProfile(): BusinessProfile | null {
  try {
    const local = localStorage.getItem("scrapflow-business-profile");
    if (local) return { ...emptyBusinessProfile, ...(JSON.parse(local) as Partial<BusinessProfile>) };
    const cookie = document.cookie.split("; ").find((item) => item.startsWith("scrapflow-business-profile="));
    if (cookie) return { ...emptyBusinessProfile, ...(JSON.parse(decodeURIComponent(cookie.split("=").slice(1).join("="))) as Partial<BusinessProfile>) };
  } catch {
    return null;
  }
  return null;
}

export function saveBusinessProfile(profile: BusinessProfile): boolean {
  try {
    const value = JSON.stringify(profile);
    localStorage.setItem("scrapflow-business-profile", value);
    document.cookie = `scrapflow-business-profile=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
    return true;
  } catch {
    return false;
  }
}
