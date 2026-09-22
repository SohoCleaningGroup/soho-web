import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

import { SITE_NAME, SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Manhattan Apartment Cleaning | SoHo Cleaning Group",
    template: `%s | ${SITE_NAME}`,
  },

  description:
    "Premium residential cleaning services in Manhattan. Detailed, reliable care for pristine homes by SoHo Cleaning Group.",

  applicationName: "SoHo Cleaning Group",

  openGraph: {
    type: "website",
    siteName: "SoHo Cleaning Group",
    title: "SoHo Cleaning Group | Premium Cleaning in Manhattan",
    description:
      "Premium residential cleaning services in Manhattan. Detailed, reliable care for pristine homes.",
    url: "/",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SoHo Cleaning Group",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "SoHo Cleaning Group | Premium Cleaning in Manhattan",
    description:
      "Premium residential cleaning services in Manhattan. Detailed, reliable care for pristine homes.",
    images: ["/og-image.png"],
  },

};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col"
      >
        {children}
        <Analytics />
        <GoogleAnalytics gaId="G-GBDJ96C34C" />
      </body>
    </html>
  );
}
