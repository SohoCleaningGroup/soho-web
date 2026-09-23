import { notFound, redirect } from "next/navigation";
import { AdditionalAuthorizationStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import BookingStatusActions from "@/components/admin/bookings/BookingStatusActions";
import PaymentActions from "@/components/admin/payments/PaymentActions";
import { hasValidAdminSession } from "@/lib/security/admin-auth";

type PaymentStatus =
    | "PENDING"
    | "AUTHORIZED"
    | "PAID"
    | "CANCELLED"
    | "FAILED"
    | "REFUNDED";

type BookingPayment = {
    id: string;
    authorizedAmount: number;
    capturedAmount: number | null;
    currency: string;
    status: PaymentStatus;
    provider: string;
    paymentIntentId: string | null;
    checkoutSessionId: string | null;
    transactionId: string | null;
    isAdditionalAuthorization: boolean;
    authorizedAt: Date | null;
    paidAt: Date | null;
    cancelledAt: Date | null;
    createdAt: Date;
};

const addOnLabels: Record<string, string> = {
    INSIDE_FRIDGE: "Inside Fridge Cleaning",
};

export default async function BookingDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    if (!(await hasValidAdminSession())) {
        redirect("/admin/login");
    }

    const { id } = await params;

    const booking = await prisma.booking.findUnique({
        where: {
            id,
        },
        include: {
            userProfile: true,

            payments: {
                orderBy: [
                    {
                        isAdditionalAuthorization: "asc",
                    },
                    {
                        createdAt: "asc",
                    },
                ],
            },

            additionalAuthorizations: {
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    });

    if (!booking) {
        notFound();
    }

    const payments = booking.payments as BookingPayment[];

    const activeAuthorizedPayments = payments.filter(
        (payment) => payment.status === "AUTHORIZED"
    );

    const sourcePayment =
        activeAuthorizedPayments.find(
            (payment) => !payment.isAdditionalAuthorization
        ) || activeAuthorizedPayments[0];

    const latestPayment =
        payments.length > 0
            ? [...payments].sort(
                  (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
              )[0]
            : undefined;

    const pendingAdditionalAuthorization =
        booking.additionalAuthorizations.find(
            (request) =>
                request.status === AdditionalAuthorizationStatus.PENDING &&
                request.expiresAt > new Date()
        );

    const totalAuthorizedAmount = activeAuthorizedPayments.reduce(
        (total, payment) => total + payment.authorizedAmount,
        0
    );

    const totalCapturedAmount = payments.reduce(
        (total, payment) => total + (payment.capturedAmount ?? 0),
        0
    );

    const displayCurrency =
        sourcePayment?.currency || latestPayment?.currency || "USD";

    const currentPaymentStatus: PaymentStatus | null =
        activeAuthorizedPayments.length > 0
            ? "AUTHORIZED"
            : latestPayment?.status || null;

    return (
        <section>
            <div className="mb-10">
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.34em] text-[#b7924c]">
                    Booking Details
                </p>

                <h1 className="font-serif text-5xl text-white">
                    {booking.userProfile.fullName}
                </h1>

                <p className="mt-4 text-[#cfc7b7]">
                    Full booking information and customer request details.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">
                <div className="grid gap-6">
                    <Panel title="Customer Details">
                        <InfoGrid
                            items={[
                                ["Name", booking.userProfile.fullName],
                                ["Email", booking.userProfile.email],
                                ["Phone", booking.userProfile.phone],
                                [
                                    "Address",
                                    `${booking.userProfile.address || ""} ${
                                        booking.userProfile.apartment || ""
                                    }`.trim(),
                                ],
                                [
                                    "City / State / Zip",
                                    `${booking.userProfile.city || ""}, ${
                                        booking.userProfile.state || ""
                                    } ${
                                        booking.userProfile.zipCode || ""
                                    }`.trim(),
                                ],
                            ]}
                        />
                    </Panel>

                    <Panel title="Cleaning Details">
                        <InfoGrid
                            items={[
                                ["Service", formatLabel(booking.cleaningType)],
                                ["Home Size", booking.homeSize],
                                ["Bedrooms", String(booking.bedrooms ?? 0)],
                                ["Bathrooms", String(booking.bathrooms ?? 0)],
                                ["Kitchen", String(booking.kitchens ?? 0)],
                                ["Pets", booking.hasPets ? "Yes" : "No"],
                                [
                                    "Add-On Services",
                                    booking.selectedAddOns.length
                                        ? booking.selectedAddOns
                                              .map(
                                                  (addOn) =>
                                                      addOnLabels[addOn] ||
                                                      formatLabel(addOn)
                                              )
                                              .join(", ")
                                        : "None",
                                ],
                                [
                                    "Add-On Total",
                                    `$${booking.addOnTotal.toFixed(2)}`,
                                ],
                                [
                                    "Frequency",
                                    formatLabel(booking.frequency),
                                ],
                            ]}
                        />
                    </Panel>

                    <Panel title="Special Notes">
                        <p className="text-sm leading-7 text-[#f3eadb]">
                            {booking.specialNotes ||
                                "No special notes added."}
                        </p>
                    </Panel>
                </div>

                <div className="grid gap-6">
                    <Panel title="Schedule">
                        <InfoGrid
                            items={[
                                [
                                    "Preferred Date",
                                    booking.preferredDate
                                        ? booking.preferredDate.toDateString()
                                        : "Not selected",
                                ],
                                [
                                    "Preferred Time",
                                    booking.preferredTime || "Not selected",
                                ],
                                [
                                    "Created",
                                    booking.createdAt.toLocaleString("en-US"),
                                ],
                            ]}
                        />
                    </Panel>

                    <Panel title="Booking Status">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <BookingStatusBadge status={booking.status} />

                            <p className="text-sm text-[#8f8778]">
                                Manage booking workflow status.
                            </p>
                        </div>

                        <div className="mt-6">
                            <BookingStatusActions
                                bookingId={booking.id}
                                currentStatus={booking.status}
                            />
                        </div>
                    </Panel>

                    <Panel title="Payment Status">
                        {!latestPayment ? (
                            <p className="text-sm text-[#8f8778]">
                                No payment authorization has been recorded yet.
                            </p>
                        ) : (
                            <div className="space-y-5">
                                <div className="flex flex-wrap items-start justify-between gap-5">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-[#8f8778]">
                                            Current Payment State
                                        </p>

                                        <div className="mt-3">
                                            <PaymentStatusBadge
                                                status={
                                                    currentPaymentStatus ||
                                                    latestPayment.status
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-xs uppercase tracking-[0.2em] text-[#8f8778]">
                                            Active Authorization
                                        </p>

                                        <p className="mt-2 font-serif text-4xl text-white">
                                            {displayCurrency}{" "}
                                            {totalAuthorizedAmount.toFixed(2)}
                                        </p>

                                        {totalCapturedAmount > 0 && (
                                            <p className="mt-2 text-xs text-emerald-300">
                                                Captured: {displayCurrency}{" "}
                                                {totalCapturedAmount.toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <PaymentStatusMessage
                                    status={
                                        currentPaymentStatus ||
                                        latestPayment.status
                                    }
                                />

                                {sourcePayment && totalAuthorizedAmount > 0 && (
                                    <PaymentActions
                                        bookingId={booking.id}
                                        sourcePaymentId={sourcePayment.id}
                                        currentStatus="AUTHORIZED"
                                        totalAuthorizedAmount={
                                            totalAuthorizedAmount
                                        }
                                        pendingAuthorization={
                                            pendingAdditionalAuthorization
                                                ? {
                                                      id: pendingAdditionalAuthorization.id,
                                                      additionalAmount:
                                                          pendingAdditionalAuthorization.additionalAmount,
                                                      reason:
                                                          pendingAdditionalAuthorization.reason,
                                                      createdAt:
                                                          pendingAdditionalAuthorization.createdAt.toISOString(),
                                                      expiresAt:
                                                          pendingAdditionalAuthorization.expiresAt.toISOString(),
                                                  }
                                                : null
                                        }
                                    />
                                )}
                            </div>
                        )}
                    </Panel>

                    <Panel title="Payment History">
                        {payments.length === 0 ? (
                            <p className="text-sm text-[#8f8778]">
                                No payments recorded yet.
                            </p>
                        ) : (
                            <div className="grid gap-4">
                                {payments.map((payment) => (
                                    <div
                                        key={payment.id}
                                        className="rounded-[24px] border border-[#2f291d] bg-[#111111] p-5"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div>
                                                <p className="text-[11px] uppercase tracking-[0.2em] text-[#b7924c]">
                                                    {payment.isAdditionalAuthorization
                                                        ? "Additional Authorization"
                                                        : "Original Authorization"}
                                                </p>

                                                <p className="mt-2 font-serif text-3xl text-white">
                                                    {payment.currency}{" "}
                                                    {payment.authorizedAmount.toFixed(
                                                        2
                                                    )}
                                                </p>

                                                <p className="mt-2 text-xs text-[#8f8778]">
                                                    {payment.provider} ·{" "}
                                                    {payment.createdAt.toLocaleString(
                                                        "en-US"
                                                    )}
                                                </p>
                                            </div>

                                            <PaymentStatusBadge
                                                status={payment.status}
                                            />
                                        </div>

                                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                            <PaymentDetail
                                                label="Authorized Amount"
                                                value={`${
                                                    payment.currency
                                                } ${payment.authorizedAmount.toFixed(
                                                    2
                                                )}`}
                                            />

                                            <PaymentDetail
                                                label="Captured Amount"
                                                value={
                                                    payment.capturedAmount !==
                                                    null
                                                        ? `${
                                                              payment.currency
                                                          } ${payment.capturedAmount.toFixed(
                                                              2
                                                          )}`
                                                        : "Not captured"
                                                }
                                            />

                                            <PaymentDetail
                                                label="Authorized At"
                                                value={
                                                    payment.authorizedAt
                                                        ? payment.authorizedAt.toLocaleString(
                                                              "en-US"
                                                          )
                                                        : "Not authorized"
                                                }
                                            />

                                            <PaymentDetail
                                                label="Captured At"
                                                value={
                                                    payment.paidAt
                                                        ? payment.paidAt.toLocaleString(
                                                              "en-US"
                                                          )
                                                        : "Not captured"
                                                }
                                            />

                                            <PaymentDetail
                                                label="Released At"
                                                value={
                                                    payment.cancelledAt
                                                        ? payment.cancelledAt.toLocaleString(
                                                              "en-US"
                                                          )
                                                        : "Not released"
                                                }
                                            />

                                            <PaymentDetail
                                                label="Transaction ID"
                                                value={
                                                    payment.transactionId ||
                                                    "Not available"
                                                }
                                            />
                                        </div>

                                        <div className="mt-5 space-y-3 border-t border-[#2f291d] pt-5 text-xs text-[#8f8778]">
                                            <p className="break-all">
                                                <span className="text-[#b8ad9a]">
                                                    Payment Intent:
                                                </span>{" "}
                                                {payment.paymentIntentId ||
                                                    "Not available"}
                                            </p>

                                            <p className="break-all">
                                                <span className="text-[#b8ad9a]">
                                                    Checkout Session:
                                                </span>{" "}
                                                {payment.checkoutSessionId ||
                                                    "Not available"}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>
                </div>
            </div>
        </section>
    );
}

function Panel({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-[28px] border border-[#2a2419] bg-[#0a0a0a] p-6">
            <h2 className="mb-6 font-serif text-3xl text-white">
                {title}
            </h2>

            {children}
        </div>
    );
}

function InfoGrid({
    items,
}: {
    items: Array<[string, string]>;
}) {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            {items.map(([label, value]) => (
                <div
                    key={label}
                    className="rounded-[22px] border border-[#2f291d] bg-[#111111] p-5"
                >
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#8f8778]">
                        {label}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-[#f3eadb]">
                        {value || "Not provided"}
                    </p>
                </div>
            ))}
        </div>
    );
}

function PaymentDetail({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-[18px] border border-[#2f291d] bg-[#0a0a0a] p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#8f8778]">
                {label}
            </p>

            <p className="mt-2 break-all text-sm leading-6 text-[#f3eadb]">
                {value}
            </p>
        </div>
    );
}

function PaymentStatusMessage({
    status,
}: {
    status: PaymentStatus;
}) {
    const messages: Record<
        PaymentStatus,
        {
            title: string;
            description: string;
            className: string;
        }
    > = {
        PENDING: {
            title: "Waiting for authorization",
            description:
                "The customer has not completed the card authorization yet.",
            className:
                "border-slate-500/30 bg-slate-500/10 text-slate-200",
        },

        AUTHORIZED: {
            title: "Funds are currently on hold",
            description:
                "The customer’s card has been authorized. Capture the payment after the cleaning service is completed.",
            className:
                "border-amber-500/30 bg-amber-500/10 text-amber-200",
        },

        PAID: {
            title: "Payment successfully captured",
            description:
                "The authorized amount has been charged to the customer’s card.",
            className:
                "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
        },

        CANCELLED: {
            title: "Authorization released",
            description:
                "The card authorization was cancelled and the customer will not be charged.",
            className:
                "border-rose-500/30 bg-rose-500/10 text-rose-200",
        },

        FAILED: {
            title: "Payment failed",
            description:
                "The payment authorization or capture failed and requires attention.",
            className:
                "border-red-500/30 bg-red-500/10 text-red-200",
        },

        REFUNDED: {
            title: "Payment refunded",
            description:
                "The captured payment has been refunded to the customer.",
            className:
                "border-sky-500/30 bg-sky-500/10 text-sky-200",
        },
    };

    const message = messages[status];

    return (
        <div className={`rounded-[20px] border p-4 ${message.className}`}>
            <p className="text-sm font-semibold">{message.title}</p>

            <p className="mt-2 text-xs leading-6 opacity-80">
                {message.description}
            </p>
        </div>
    );
}

function BookingStatusBadge({
    status,
}: {
    status: string;
}) {
    const styles: Record<string, string> = {
        PENDING:
            "border-amber-500/30 bg-amber-500/10 text-amber-300",
        CONFIRMED:
            "border-blue-500/30 bg-blue-500/10 text-blue-300",
        ASSIGNED:
            "border-violet-500/30 bg-violet-500/10 text-violet-300",
        COMPLETED:
            "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        CANCELLED:
            "border-rose-500/30 bg-rose-500/10 text-rose-300",
    };

    return (
        <span
            className={`inline-flex rounded-full border px-4 py-2 text-sm font-medium ${
                styles[status] ||
                "border-[#8f6b2f] bg-[#151008] text-[#d6ab5f]"
            }`}
        >
            {formatLabel(status)}
        </span>
    );
}

function PaymentStatusBadge({
    status,
}: {
    status: PaymentStatus;
}) {
    const config: Record<
        PaymentStatus,
        {
            label: string;
            dot: string;
            className: string;
        }
    > = {
        PENDING: {
            label: "Pending",
            dot: "bg-slate-300",
            className:
                "border-slate-500/30 bg-slate-500/10 text-slate-200",
        },

        AUTHORIZED: {
            label: "Authorized",
            dot: "bg-amber-300",
            className:
                "border-amber-500/30 bg-amber-500/10 text-amber-200",
        },

        PAID: {
            label: "Captured",
            dot: "bg-emerald-300",
            className:
                "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
        },

        CANCELLED: {
            label: "Released",
            dot: "bg-rose-300",
            className:
                "border-rose-500/30 bg-rose-500/10 text-rose-200",
        },

        FAILED: {
            label: "Failed",
            dot: "bg-red-300",
            className:
                "border-red-500/30 bg-red-500/10 text-red-200",
        },

        REFUNDED: {
            label: "Refunded",
            dot: "bg-sky-300",
            className:
                "border-sky-500/30 bg-sky-500/10 text-sky-200",
        },
    };

    const item = config[status];

    return (
        <span
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${item.className}`}
        >
            <span className={`h-2 w-2 rounded-full ${item.dot}`} />
            {item.label}
        </span>
    );
}

function formatLabel(value: string) {
    return value
        .toLowerCase()
        .split("_")
        .map(
            (word) =>
                word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join(" ");
}
