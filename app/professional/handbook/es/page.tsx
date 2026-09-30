import CleanerHandbook from "@/components/professional/CleanerHandbook";
import { CLEANER_HANDBOOK_SECTIONS_ES } from "@/lib/cleaner-handbook-es";
import { NO_INDEX_METADATA } from "@/lib/site";

export const metadata = { ...NO_INDEX_METADATA, title: "Manual de limpieza | SoHo Cleaning Group" };

export default function SpanishCleanerHandbookPage() {
  return <CleanerHandbook sections={CLEANER_HANDBOOK_SECTIONS_ES} version="30 de septiembre de 2026" spanish />;
}
