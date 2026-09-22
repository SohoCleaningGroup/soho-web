import type { Metadata } from "next";

export const SITE_NAME = "SoHo Cleaning Group";
export const SITE_URL = "https://sohocleaninggroup.com";
export const PHONE_NUMBER = "+1 (646) 530-0590";
export const PHONE_HREF = "tel:+16465300590";
export const EMAIL = "info@sohocleaninggroup.com";
export const GOOGLE_REVIEW_URL = "https://g.page/r/CcebMKcdVpKsEBM/review";

export const NO_INDEX_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${SITE_URL}/#business`,
  name: SITE_NAME,
  url: SITE_URL,
  telephone: "+16465300590",
  email: EMAIL,
  image: `${SITE_URL}/images/og/home.png`,
  priceRange: "$$$",
  address: {
    "@type": "PostalAddress",
    addressLocality: "New York",
    addressRegion: "NY",
    addressCountry: "US",
  },
  areaServed: {
    "@type": "AdministrativeArea",
    name: "Manhattan, New York",
  },
};
