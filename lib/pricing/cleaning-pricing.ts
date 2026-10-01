export type CleaningType =
  | "SOHO_SIGNATURE"
  | "SOHO_SIGNATURE_DEEP"
  | "MOVE_IN_MOVE_OUT"
  | "RECURRING"
  | "AIRBNB_TURNOVER";

export type HomeSize = "1BHK" | "2BHK" | "3BHK" | "4BHK";
export type RecurringFrequency = "WEEKLY" | "BI_WEEKLY" | "MONTHLY";

export const recurringDiscountPercent: Record<RecurringFrequency, number> = {
  WEEKLY: 15,
  BI_WEEKLY: 10,
  MONTHLY: 5,
};

type PricingRule = {
  label: string;
  basePrices: Record<HomeSize, number>;
  standardSqft: Record<HomeSize, number>;
  extraSqftRate: number;
};

export const pricingConfig: Record<CleaningType, PricingRule> = {
  SOHO_SIGNATURE: {
    label: "SoHo Signature",
    basePrices: {
      "1BHK": 150,
      "2BHK": 220,
      "3BHK": 300,
      "4BHK": 380,
    },
    standardSqft: {
      "1BHK": 700,
      "2BHK": 1100,
      "3BHK": 1600,
      "4BHK": 2200,
    },
    extraSqftRate: 0.15,
  },

  SOHO_SIGNATURE_DEEP: {
    label: "SoHo Signature Deep",
    basePrices: {
      "1BHK": 250,
      "2BHK": 350,
      "3BHK": 480,
      "4BHK": 620,
    },
    standardSqft: {
      "1BHK": 700,
      "2BHK": 1100,
      "3BHK": 1600,
      "4BHK": 2200,
    },
    extraSqftRate: 0.25,
  },

  MOVE_IN_MOVE_OUT: {
    label: "Move In / Move Out",
    basePrices: {
      "1BHK": 280,
      "2BHK": 400,
      "3BHK": 550,
      "4BHK": 700,
    },
    standardSqft: {
      "1BHK": 700,
      "2BHK": 1100,
      "3BHK": 1600,
      "4BHK": 2200,
    },
    extraSqftRate: 0.3,
  },

  RECURRING: {
    label: "Recurring Cleaning",
    basePrices: {
      "1BHK": 150,
      "2BHK": 220,
      "3BHK": 300,
      "4BHK": 380,
    },
    standardSqft: {
      "1BHK": 700,
      "2BHK": 1100,
      "3BHK": 1600,
      "4BHK": 2200,
    },
    extraSqftRate: 0.15,
  },

  AIRBNB_TURNOVER: {
    label: "Airbnb Turnover",
    basePrices: {
      "1BHK": 170,
      "2BHK": 240,
      "3BHK": 330,
      "4BHK": 430,
    },
    standardSqft: {
      "1BHK": 700,
      "2BHK": 1100,
      "3BHK": 1600,
      "4BHK": 2200,
    },
    extraSqftRate: 0.18,
  },
};

export function getHomeSizeLabel(homeSize: HomeSize): string {
  switch (homeSize) {
    case "1BHK":
      return "1 BR";
    case "2BHK":
      return "2 BR";
    case "3BHK":
      return "3 BR";
    case "4BHK":
      return "4 BR";
    default:
      return homeSize;
  }
}

export function calculateCleaningPrice({
  cleaningType,
  homeSize,
  totalSqft,
  frequency,
}: {
  cleaningType: CleaningType;
  homeSize: HomeSize;
  totalSqft: number;
  frequency?: string;
}) {
  const rule = pricingConfig[cleaningType];

  if (!rule) {
    throw new Error("Invalid cleaning type");
  }

  const basePrice = rule.basePrices[homeSize];
  const includedSqft = rule.standardSqft[homeSize];

  if (!basePrice || !includedSqft) {
    throw new Error("Invalid home size");
  }

  const safeTotalSqft =
    Number.isFinite(totalSqft) && totalSqft > 0
      ? totalSqft
      : includedSqft;

  const extraSqft = Math.max(0, safeTotalSqft - includedSqft);
  const extraSqftCharge = Number(
    (extraSqft * rule.extraSqftRate).toFixed(2)
  );
  const undiscountedTotal = Number((basePrice + extraSqftCharge).toFixed(2));
  const discountPercent = cleaningType === "RECURRING"
    ? recurringDiscountPercent[frequency as RecurringFrequency] || 0
    : 0;
  const recurringDiscount = Number((undiscountedTotal * discountPercent / 100).toFixed(2));
  const total = Number((undiscountedTotal - recurringDiscount).toFixed(2));

  return {
    serviceLabel: rule.label,
    homeSize, // Internal value (keep unchanged)
    homeSizeLabel: getHomeSizeLabel(homeSize), // Display value
    basePrice,
    includedSqft,
    totalSqft: safeTotalSqft,
    extraSqft,
    extraSqftRate: rule.extraSqftRate,
    extraSqftCharge,
    undiscountedTotal,
    recurringDiscount,
    recurringDiscountPercent: discountPercent,
    total,
    currency: "USD",
  };
}
