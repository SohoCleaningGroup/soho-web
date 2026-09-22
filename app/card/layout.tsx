import type { Metadata } from "next";

import { NO_INDEX_METADATA } from "@/lib/site";

export const metadata: Metadata = NO_INDEX_METADATA;

export default function CardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
