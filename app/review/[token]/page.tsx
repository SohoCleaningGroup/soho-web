import JobPage from "@/components/jobs/JobPage";
export const metadata = { title: "SoHo — Private job page", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{token: string}> }) {
  const { token } = await params; return <JobPage token={token} review={true} />;
}
