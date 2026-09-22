import type { Metadata } from "next";

import ServicePage from "@/components/marketing/ServicePage";
import { getService } from "@/data/services";

const service = getService("standard-cleaning");

export const metadata: Metadata = {
  title: service.metaTitle,
  description: service.metaDescription,
  alternates: { canonical: `/services/${service.slug}` },
  openGraph: {
    title: service.metaTitle,
    description: service.metaDescription,
    url: `/services/${service.slug}`,
    images: [service.image],
  },
};

export default function StandardCleaningPage() {
  return <ServicePage service={service} />;
}
