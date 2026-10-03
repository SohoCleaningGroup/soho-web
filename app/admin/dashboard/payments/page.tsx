import Link from "next/link";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{before?:string}>}) {
  const {before}=await searchParams,cursor=before?new Date(before):null;
  const payments=await prisma.payment.findMany({where:cursor&&Number.isFinite(cursor.getTime())?{createdAt:{lt:cursor}}:{},take:26,orderBy:{createdAt:"desc"},include:{booking:{include:{userProfile:{select:{fullName:true}}}}}});
  return <section className="space-y-5"><h1 className="font-serif text-4xl">Payments</h1><p className="text-[#cfc7b7]">Open a booking to review authorizations, capture, releases, and payment history.</p>{!payments.length&&<p>No payments recorded yet.</p>}{payments.slice(0,25).map(p=><Link key={p.id} href={`/admin/dashboard/bookings/${p.bookingId}#payment`} className="block rounded-xl border border-[#352b1c] bg-[#111111] p-5"><div className="flex flex-wrap justify-between gap-3"><span>{p.booking.userProfile.fullName} · {p.currency} {p.authorizedAmount.toFixed(2)}</span><span className="text-[#e3bd74]">{p.status.toLowerCase()}</span></div><p className="mt-1 text-sm text-[#cfc7b7]">{p.isAdditionalAuthorization?'Additional authorization':'Original authorization'} · {p.createdAt.toLocaleDateString("en-US",{timeZone:"America/New_York"})} · View booking →</p></Link>)}{payments.length>25&&<Link className="text-[#e3bd74] underline" href={`?before=${encodeURIComponent(payments[24].createdAt.toISOString())}`}>Older payments →</Link>}</section>;
}
