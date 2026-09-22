import type { Metadata } from "next";
import ProfessionalOnboardingForm from "@/components/onboarding/professional/ProfessionalOnboardingForm";

import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title:
    "Join SoHo Cleaning Group | Professional Cleaning Careers in Manhattan",

  description:
    "Apply to join SoHo Cleaning Group as a trusted cleaning professional. Work with a premium Manhattan cleaning company built on professionalism, trust, and high service standards.",

  openGraph: {
    title: "Become a SoHo Cleaning Group Professional",

    description:
      "Join a premium cleaning team serving Manhattan homes. We work with carefully selected professionals who value quality, trust, and exceptional service.",

    url: `${SITE_URL}/onboarding/professional`,

    siteName: "SoHo Cleaning Group",

    images: [
      {
        url: "/images/og/professional-onboarding.png",
        width: 1200,
        height: 630,
        alt: "Join SoHo Cleaning Group Professional Team",
      },
    ],

    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",

    title: "Join SoHo Cleaning Group",

    description:
      "Build your cleaning career with a premium Manhattan cleaning company focused on trust, standards, and professionalism.",

    images: ["/images/og/professional-onboarding.png"],
  },
};

export default function ProfessionalOnboardingPage() {
  return <ProfessionalOnboardingForm />;
}
