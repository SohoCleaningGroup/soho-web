import { getConsentSession } from "@/lib/security/sms-consent-session";
import UserOnboardingForm from "@/components/onboarding/user/UserOnboardingForm";

export default async function UserOnboardingPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const code = typeof ref === "string" && /^SOHO-[A-F0-9]{12}$/i.test(ref) ? ref.toUpperCase() : "";
  const initialSmsPreference = await getConsentSession();
  return <UserOnboardingForm initialSmsPreference={initialSmsPreference} initialReferralCode={code} isTestSite={process.env.VERCEL_ENV === "preview"} />;
}
