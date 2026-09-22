import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AdditionalAuthorizationStatus,
  PaymentStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

export const metadata: Metadata = {
  title: "Additional Card Authorization | SoHo Cleaning Group",
  description:
    "Review and securely authorize an additional amount for your SoHo Cleaning Group booking.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdditionalAuthorizationPage({
  params,
}: PageProps) {
  const { token } = await params;

  const authorization =
    await prisma.additionalAuthorization.findUnique({
      where: {
        token,
      },
      include: {
        payment: {
          select: {
            id: true,
            currency: true,
            authorizedAmount: true,
            status: true,
          },
        },
        booking: {
          include: {
            userProfile: true,
            payments: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
      },
    });

  if (!authorization) {
    notFound();
  }

  const now = new Date();

  const hasExpired =
    authorization.status === AdditionalAuthorizationStatus.EXPIRED ||
    authorization.expiresAt <= now;

  /*
   * Keep the database synchronized when a pending request is opened
   * after its expiration time.
   */
  if (
    hasExpired &&
    authorization.status === AdditionalAuthorizationStatus.PENDING
  ) {
    await prisma.additionalAuthorization.update({
      where: {
        id: authorization.id,
      },
      data: {
        status: AdditionalAuthorizationStatus.EXPIRED,
      },
    });
  }

  const isPending =
    authorization.status === AdditionalAuthorizationStatus.PENDING &&
    !hasExpired;

  const isAuthorized =
    authorization.status ===
    AdditionalAuthorizationStatus.AUTHORIZED;

  const isCancelled =
    authorization.status ===
    AdditionalAuthorizationStatus.CANCELLED;

  const currency =
    authorization.payment?.currency ||
    authorization.booking.payments[0]?.currency ||
    "USD";

  const currentlyAuthorizedAmount = Number(
    authorization.booking.payments
      .filter(
        (payment) =>
          payment.status === PaymentStatus.AUTHORIZED ||
          payment.status === PaymentStatus.PAID
      )
      .reduce(
        (total, payment) =>
          total + payment.authorizedAmount,
        0
      )
      .toFixed(2)
  );

  const updatedAuthorizedTotal = Number(
    (
      currentlyAuthorizedAmount +
      authorization.additionalAmount
    ).toFixed(2)
  );

  if (!isPending) {
    return (
      <AuthorizationStatePage
        status={
          isAuthorized
            ? "AUTHORIZED"
            : isCancelled
              ? "CANCELLED"
              : "EXPIRED"
        }
        amount={authorization.additionalAmount}
        currency={currency}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#060606] px-4 py-10 text-white sm:px-6">
      <section className="mx-auto flex min-h-[85vh] max-w-3xl items-center justify-center">
        <div className="w-full rounded-[32px] border border-[#2a2419] bg-[#0a0a0a] p-6 shadow-[0_24px_80px_rgba(214,171,95,0.12)] sm:p-10">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[#d6ab5f] bg-[#151008] text-3xl text-[#d6ab5f]">
              +
            </div>

            <p className="mb-4 text-xs font-medium uppercase tracking-[0.34em] text-[#b7924c]">
              Additional Authorization
            </p>

            <h1 className="font-serif text-4xl leading-tight text-white sm:text-5xl">
              Review Your Updated Cleaning Total
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#cfc7b7]">
              Hello {authorization.booking.userProfile.fullName}. An
              additional card authorization has been requested for your
              cleaning service. Please review the details below before
              continuing.
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-[26px] border border-[#3a2812] bg-[#111111]">
            <div className="border-b border-[#2f291d] px-6 py-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8f8778]">
                Authorization Summary
              </p>

              <h2 className="mt-2 font-serif text-2xl text-white">
                Updated Service Amount
              </h2>
            </div>

            <div className="space-y-5 px-6 py-6">
              <SummaryRow
                label="Currently Authorized"
                value={formatCurrency(
                  currentlyAuthorizedAmount,
                  currency
                )}
              />

              <SummaryRow
                label="Additional Authorization"
                value={`+${formatCurrency(
                  authorization.additionalAmount,
                  currency
                )}`}
                highlighted
              />

              <div className="border-t border-[#3a2812] pt-5">
                <SummaryRow
                  label="Updated Total"
                  value={formatCurrency(
                    updatedAuthorizedTotal,
                    currency
                  )}
                  large
                />
              </div>
            </div>
          </div>

          {authorization.reason && (
            <div className="mt-6 rounded-[24px] border border-[#2f291d] bg-[#111111] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8f8778]">
                Reason for Adjustment
              </p>

              <p className="mt-3 text-sm leading-7 text-[#f3eadb]">
                {authorization.reason}
              </p>
            </div>
          )}

          <div className="mt-6 rounded-[24px] border border-amber-500/30 bg-amber-500/10 p-5">
            <p className="text-sm font-semibold text-amber-200">
              This is an authorization, not an immediate charge
            </p>

            <p className="mt-2 text-sm leading-7 text-amber-100/70">
              Your card will be authorized only for the additional{" "}
              {formatCurrency(
                authorization.additionalAmount,
                currency
              )}. A temporary pending hold may appear, but the amount
              will not be captured until your cleaning service has been
              completed.
            </p>
          </div>

          <form
            action="/api/stripe/create-additional-authorization-session"
            method="POST"
            className="mt-8"
          >
            <input
              type="hidden"
              name="token"
              value={authorization.token}
            />

            <button
              type="submit"
              className="flex w-full items-center justify-center rounded-2xl bg-[#d6ab5f] px-6 py-4 text-sm font-semibold text-black transition hover:scale-[1.01]"
            >
              Authorize Additional{" "}
              {formatCurrency(
                authorization.additionalAmount,
                currency
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-xs leading-6 text-[#8f8778]">
            This secure authorization request expires on{" "}
            {authorization.expiresAt.toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            .
          </p>

          <div className="mt-8 border-t border-[#2f291d] pt-6">
            <p className="text-center text-xs leading-6 text-[#8f8778]">
              Only approve this request if you recognize the updated
              service amount. Contact SoHo Cleaning Group if you need
              clarification before proceeding.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function AuthorizationStatePage({
  status,
  amount,
  currency,
}: {
  status: "AUTHORIZED" | "CANCELLED" | "EXPIRED";
  amount: number;
  currency: string;
}) {
  const content = {
    AUTHORIZED: {
      eyebrow: "Authorization Completed",
      symbol: "✓",
      title: "Additional Amount Authorized",
      description: `The additional ${formatCurrency(
        amount,
        currency
      )} authorization has already been completed. Your card has not been charged yet.`,
      borderClass: "border-emerald-500/30",
      backgroundClass: "bg-emerald-500/10",
      textClass: "text-emerald-300",
    },
    CANCELLED: {
      eyebrow: "Request Cancelled",
      symbol: "×",
      title: "Authorization Request Cancelled",
      description:
        "This additional authorization request is no longer active. No authorization was placed through this link.",
      borderClass: "border-rose-500/30",
      backgroundClass: "bg-rose-500/10",
      textClass: "text-rose-300",
    },
    EXPIRED: {
      eyebrow: "Link Expired",
      symbol: "!",
      title: "Authorization Link Has Expired",
      description:
        "This secure authorization link is no longer valid. Please contact SoHo Cleaning Group if the additional service is still required.",
      borderClass: "border-amber-500/30",
      backgroundClass: "bg-amber-500/10",
      textClass: "text-amber-300",
    },
  }[status];

  return (
    <main className="min-h-screen bg-[#060606] px-4 py-10 text-white">
      <section className="mx-auto flex min-h-[85vh] max-w-2xl items-center justify-center">
        <div className="w-full rounded-[32px] border border-[#2a2419] bg-[#0a0a0a] p-8 text-center shadow-[0_24px_80px_rgba(214,171,95,0.12)] sm:p-10">
          <div
            className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border text-4xl ${content.borderClass} ${content.backgroundClass} ${content.textClass}`}
          >
            {content.symbol}
          </div>

          <p
            className={`mb-4 text-xs font-medium uppercase tracking-[0.34em] ${content.textClass}`}
          >
            {content.eyebrow}
          </p>

          <h1 className="font-serif text-4xl text-white sm:text-5xl">
            {content.title}
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#cfc7b7]">
            {content.description}
          </p>

          <Link
            href="/"
            className="mt-8 inline-flex rounded-2xl bg-[#d6ab5f] px-6 py-4 text-sm font-semibold text-black transition hover:scale-[1.02]"
          >
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}

function SummaryRow({
  label,
  value,
  highlighted = false,
  large = false,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
  large?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-5">
      <span
        className={
          large
            ? "text-base font-medium text-[#f3eadb]"
            : "text-xs uppercase tracking-[0.18em] text-[#8f8778]"
        }
      >
        {label}
      </span>

      <span
        className={
          large
            ? "font-serif text-3xl text-[#d6ab5f]"
            : highlighted
              ? "text-base font-semibold text-[#d6ab5f]"
              : "text-base text-[#f1e7d7]"
        }
      >
        {value}
      </span>
    </div>
  );
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}
