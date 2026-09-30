import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NO_INDEX_METADATA } from "@/lib/site";
import { REFERRAL_TERMS, canEarnReward } from "@/lib/referrals/rules";
import { referralLink } from "@/lib/referrals/service";
export const metadata = NO_INDEX_METADATA;
export const dynamic = "force-dynamic";
export default async function ReferralPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^REWARD-[A-F0-9]{32}$/.test(token)) notFound();
  const account = await prisma.referralAccount.findUnique({ where: { rewardCode: token }, include: { uses: { include: { rewardClaim: true, booking: { include: { payments: true } } } } } });
  if (!account) notFound();
  const available = account.uses.filter(u => u.kind === "FRIEND" && u.status === "EARNED" && !u.rewardClaim && u.booking && canEarnReward(u.booking)).length;
  const pending = account.uses.filter(u => u.kind === "FRIEND" && ["BOOKED", "RESERVED"].includes(u.status)).length;
  const friendLink = referralLink(account.code);
  return <main className="min-h-screen bg-[#060606] px-6 py-14 text-white"><div className="mx-auto max-w-2xl">
    <p className="text-[#d6ab5f]">SoHo Cleaning Group</p><h1 className="my-6 font-serif text-4xl">A fresh home is better shared.</h1>
    <p className="leading-7 text-[#cfc7b7]">{REFERRAL_TERMS}</p>
    <section className="my-8 rounded-2xl border border-[#8f6b2f] p-6"><h2 className="text-xl text-[#d6ab5f]">Share this friend link</h2><p className="mt-3 break-all"><a href={friendLink}>{friendLink}</a></p><p className="mt-4">Friend code: <strong>{account.code}</strong></p></section>
    <section className="rounded-2xl border border-[#8f6b2f] p-6"><h2 className="text-xl text-[#d6ab5f]">Your rewards</h2><p className="mt-3">{available} available · {pending} pending</p><p className="mt-4 break-all">Private reward code: <strong>{account.rewardCode}</strong></p><p className="mt-4 text-sm text-[#cfc7b7]">Use your original email and verified phone number. Keep this page and reward code private. A reward is reserved during checkout and restored if checkout expires or an unpaid booking is cancelled.</p><Link className="mt-6 inline-block rounded-xl bg-[#d6ab5f] px-5 py-3 text-black" href="/onboarding/user">Book your next clean</Link></section>
  </div></main>;
}
