"use client";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@next/third-parties/google";
export default function SiteAnalytics() {
  const path = usePathname();
  if (path.startsWith("/referrals/") || path.startsWith("/admin/") || path.startsWith("/jobs/") || path.startsWith("/review/")) return null;
  return <><Analytics /><GoogleAnalytics gaId="G-GBDJ96C34C" /></>;
}
