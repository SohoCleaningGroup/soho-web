import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

const publicRoutes = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "/services", priority: 0.9, changeFrequency: "monthly" as const },
  {
    path: "/services/standard-cleaning",
    priority: 0.9,
    changeFrequency: "monthly" as const,
  },
  {
    path: "/services/deep-cleaning",
    priority: 0.9,
    changeFrequency: "monthly" as const,
  },
  {
    path: "/services/move-in-move-out-cleaning",
    priority: 0.9,
    changeFrequency: "monthly" as const,
  },
  {
    path: "/services/recurring-cleaning",
    priority: 0.9,
    changeFrequency: "monthly" as const,
  },
  { path: "/our-story", priority: 0.7, changeFrequency: "yearly" as const },
  { path: "/join", priority: 0.6, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date("2026-09-22"),
    changeFrequency,
    priority,
  }));
}
