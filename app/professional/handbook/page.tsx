import CleanerHandbook from "@/components/professional/CleanerHandbook";
import { CLEANER_HANDBOOK_SECTIONS, CLEANER_HANDBOOK_VERSION } from "@/lib/cleaner-handbook";
import { NO_INDEX_METADATA } from "@/lib/site";

export const metadata = { ...NO_INDEX_METADATA, title: "Cleaner Handbook | SoHo Cleaning Group" };

export default async function CleanerHandbookPage({ searchParams }: { searchParams: Promise<{ name?: string | string[] }> }) {
  const { name } = await searchParams;
  return <CleanerHandbook sections={CLEANER_HANDBOOK_SECTIONS} version={CLEANER_HANDBOOK_VERSION} cleanerName={typeof name === "string" ? name : undefined} />;
}
