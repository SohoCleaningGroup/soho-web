import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CleanerAvailabilityLink from "@/components/admin/CleanerAvailabilityLink";
import { createCleanerAvailabilityToken, upcomingMondayUtc, parseCleanerAvailabilityWindows } from "@/lib/scheduling/cleaner-weekly-availability";
export const dynamic = "force-dynamic";
const weekdays=["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const clock=(m:number)=>`${Math.floor(m/60)%12||12}:${String(m%60).padStart(2,"0")} ${m>=720?'PM':'AM'}`;
export default async function Page() {
  const week = upcomingMondayUtc();
  const cleaners=await prisma.professionalProfile.findMany({ where:{status:"APPROVED"},select:{id:true,fullName:true,weeklyAvailability:{where:{weekStart:week},take:1}},orderBy:{fullName:"asc"} });
  return <section className="space-y-5"><h1 className="font-serif text-4xl">Availability</h1><p className="text-[#cfc7b7]">Upcoming week of {week.toLocaleDateString("en-US",{timeZone:"UTC"})} · All windows use New York time.</p>{!cleaners.length && <p>No approved cleaners yet.</p>}{cleaners.map(cleaner=>{const schedule=cleaner.weeklyAvailability[0],windows=parseCleanerAvailabilityWindows(schedule?.windows)||[];return <article key={cleaner.id} className="space-y-3 rounded-xl border border-[#352b1c] bg-[#111111] p-5"><Link href={`/admin/dashboard/professionals/${cleaner.id}`} className="text-lg text-[#e3bd74]">{cleaner.fullName}</Link>{schedule ? windows.length ? <ul>{windows.map((w,i)=><li key={i}>{weekdays[w.weekday]} · {clock(w.startMinutes)}–{clock(w.endMinutes)}</li>)}</ul>:<p>No availability submitted for this week.</p>:<p className="text-amber-200">Awaiting availability submission</p>}<CleanerAvailabilityLink path={`/availability/${cleaner.id}?token=${encodeURIComponent(createCleanerAvailabilityToken(cleaner.id))}`}/></article>})}</section>;
}
