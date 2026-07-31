const regionalPrices = {
  IN: { currency: "INR", professional: 399, enterprise: 799 },
  US: { currency: "USD", professional: 20, enterprise: 35 },
  GB: { currency: "GBP", professional: 16, enterprise: 28 },
  CA: { currency: "CAD", professional: 27, enterprise: 47 },
  AU: { currency: "AUD", professional: 30, enterprise: 53 },
  NZ: { currency: "NZD", professional: 33, enterprise: 57 },
  SG: { currency: "SGD", professional: 27, enterprise: 47 },
  AE: { currency: "AED", professional: 74, enterprise: 129 },
  SA: { currency: "SAR", professional: 75, enterprise: 131 },
  JP: { currency: "JPY", professional: 3000, enterprise: 5200 },
};

const euroRegions = new Set(["AT", "BE", "DE", "ES", "FI", "FR", "IE", "IT", "LU", "NL", "PT"]);

export function getPricingForRegion(region, locale = "en-US") {
  const plan = regionalPrices[region] || (euroRegions.has(region) ? { currency: "EUR", professional: 19, enterprise: 32 } : regionalPrices.US);

  return {
    ...plan,
    format: (amount) => new Intl.NumberFormat(locale, {
      style: "currency",
      currency: plan.currency,
      maximumFractionDigits: 0,
    }).format(amount),
  };
}

export function getRegionalPricing() {
  const locale = typeof navigator !== "undefined" ? navigator.language : "en-US";
  const region = new Intl.Locale(locale).region;
  return getPricingForRegion(region, locale);
}
