// ─── Pricing bands ─────────────────────────────────────────────────────────
// Every price in the source of truth (lib/pricing.ts, lib/career-pricing.ts)
// is a USD integer. Bands apply a discount multiplier and a display currency.
// Actual charge currency depends on Lemon Squeezy variant configuration.

export type PricingBand = "global" | "south-asia" | "growth"

export type PricingCurrency = {
  countryCode: string
  currencyCode: string
  locale: string
  band: PricingBand
  discount: number
  label: string
}

const USD_DEFAULT: PricingCurrency = {
  countryCode: "US",
  currencyCode: "USD",
  locale: "en-US",
  band: "global",
  discount: 1,
  label: "US Dollar",
}

// Band definitions. Discount is the multiplier applied to the USD base price.
// Global band countries (US, UK, EU, Gulf, SG, AU, CA, NZ, JP) pay full price.
// South Asia and Growth bands get purchasing-power-adjusted pricing.
// TODO: set final discount multipliers before international launch.
const COUNTRY_CURRENCY_MAP: Record<string, PricingCurrency> = {
  // Global band (1x) - high purchasing power
  US: { countryCode: "US", currencyCode: "USD", locale: "en-US", band: "global", discount: 1, label: "US Dollar" },
  GB: { countryCode: "GB", currencyCode: "GBP", locale: "en-GB", band: "global", discount: 1, label: "British Pound" },
  DE: { countryCode: "DE", currencyCode: "EUR", locale: "de-DE", band: "global", discount: 1, label: "Euro" },
  FR: { countryCode: "FR", currencyCode: "EUR", locale: "fr-FR", band: "global", discount: 1, label: "Euro" },
  ES: { countryCode: "ES", currencyCode: "EUR", locale: "es-ES", band: "global", discount: 1, label: "Euro" },
  IT: { countryCode: "IT", currencyCode: "EUR", locale: "it-IT", band: "global", discount: 1, label: "Euro" },
  NL: { countryCode: "NL", currencyCode: "EUR", locale: "nl-NL", band: "global", discount: 1, label: "Euro" },
  CA: { countryCode: "CA", currencyCode: "CAD", locale: "en-CA", band: "global", discount: 1, label: "Canadian Dollar" },
  AU: { countryCode: "AU", currencyCode: "AUD", locale: "en-AU", band: "global", discount: 1, label: "Australian Dollar" },
  NZ: { countryCode: "NZ", currencyCode: "NZD", locale: "en-NZ", band: "global", discount: 1, label: "New Zealand Dollar" },
  JP: { countryCode: "JP", currencyCode: "JPY", locale: "ja-JP", band: "global", discount: 1, label: "Japanese Yen" },
  AE: { countryCode: "AE", currencyCode: "USD", locale: "en-AE", band: "global", discount: 1, label: "US Dollar" },
  SA: { countryCode: "SA", currencyCode: "USD", locale: "en-SA", band: "global", discount: 1, label: "US Dollar" },
  QA: { countryCode: "QA", currencyCode: "USD", locale: "en-QA", band: "global", discount: 1, label: "US Dollar" },
  KW: { countryCode: "KW", currencyCode: "USD", locale: "en-KW", band: "global", discount: 1, label: "US Dollar" },
  BH: { countryCode: "BH", currencyCode: "USD", locale: "en-BH", band: "global", discount: 1, label: "US Dollar" },
  OM: { countryCode: "OM", currencyCode: "USD", locale: "en-OM", band: "global", discount: 1, label: "US Dollar" },
  SG: { countryCode: "SG", currencyCode: "SGD", locale: "en-SG", band: "global", discount: 1, label: "Singapore Dollar" },

  // South Asia band - heavy PPP discount
  // TODO: set final discount before launch (placeholder 0.35 = ~65% off).
  PK: { countryCode: "PK", currencyCode: "PKR", locale: "en-PK", band: "south-asia", discount: 0.35, label: "Pakistani Rupee" },
  IN: { countryCode: "IN", currencyCode: "INR", locale: "en-IN", band: "south-asia", discount: 0.35, label: "Indian Rupee" },
  BD: { countryCode: "BD", currencyCode: "BDT", locale: "en-BD", band: "south-asia", discount: 0.35, label: "Bangladeshi Taka" },
  LK: { countryCode: "LK", currencyCode: "LKR", locale: "en-LK", band: "south-asia", discount: 0.35, label: "Sri Lankan Rupee" },
  NP: { countryCode: "NP", currencyCode: "NPR", locale: "en-NP", band: "south-asia", discount: 0.35, label: "Nepalese Rupee" },

  // Growth band - moderate PPP discount
  // TODO: set final discount before launch (placeholder 0.5 = ~50% off).
  PH: { countryCode: "PH", currencyCode: "PHP", locale: "en-PH", band: "growth", discount: 0.5, label: "Philippine Peso" },
  NG: { countryCode: "NG", currencyCode: "NGN", locale: "en-NG", band: "growth", discount: 0.5, label: "Nigerian Naira" },
  KE: { countryCode: "KE", currencyCode: "KES", locale: "en-KE", band: "growth", discount: 0.5, label: "Kenyan Shilling" },
  EG: { countryCode: "EG", currencyCode: "EGP", locale: "ar-EG", band: "growth", discount: 0.5, label: "Egyptian Pound" },
  VN: { countryCode: "VN", currencyCode: "VND", locale: "vi-VN", band: "growth", discount: 0.5, label: "Vietnamese Dong" },
  ID: { countryCode: "ID", currencyCode: "IDR", locale: "id-ID", band: "growth", discount: 0.5, label: "Indonesian Rupiah" },
  BR: { countryCode: "BR", currencyCode: "BRL", locale: "pt-BR", band: "growth", discount: 0.5, label: "Brazilian Real" },
  MX: { countryCode: "MX", currencyCode: "MXN", locale: "es-MX", band: "growth", discount: 0.5, label: "Mexican Peso" },
  CO: { countryCode: "CO", currencyCode: "COP", locale: "es-CO", band: "growth", discount: 0.5, label: "Colombian Peso" },
  ZA: { countryCode: "ZA", currencyCode: "ZAR", locale: "en-ZA", band: "growth", discount: 0.5, label: "South African Rand" },
  TR: { countryCode: "TR", currencyCode: "TRY", locale: "tr-TR", band: "growth", discount: 0.5, label: "Turkish Lira" },
  CN: { countryCode: "CN", currencyCode: "CNY", locale: "zh-CN", band: "growth", discount: 0.5, label: "Chinese Yuan" },
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const readCountryFromHeaders = (headerStore: Headers) => {
  const candidates = [
    headerStore.get("x-vercel-ip-country"),
    headerStore.get("cf-ipcountry"),
    headerStore.get("x-country-code"),
  ]
    .map((v) => v?.trim().toUpperCase() || "")
    .filter(Boolean)

  return candidates[0] || USD_DEFAULT.countryCode
}

export const resolvePricingCurrency = (headerStore: Headers): PricingCurrency => {
  const countryCode = readCountryFromHeaders(headerStore)
  return COUNTRY_CURRENCY_MAP[countryCode] || { ...USD_DEFAULT, countryCode }
}

// FX rates for display only. These are NOT used for charging (LS handles that).
// Intentionally approximate. Update periodically or fetch from an API.
const DISPLAY_FX_RATES: Record<string, number> = {
  USD: 1, GBP: 0.79, EUR: 0.92, CAD: 1.37, AUD: 1.52, NZD: 1.66,
  SGD: 1.35, JPY: 155, PKR: 278, INR: 83.5, BDT: 110, LKR: 320,
  NPR: 133, PHP: 56, NGN: 1550, KES: 129, EGP: 49, VND: 25300,
  IDR: 15800, BRL: 5, MXN: 17.2, COP: 4000, ZAR: 18.5, TRY: 32, CNY: 7.24,
}

export const formatLocalizedPrice = (usdAmount: number, pricingCurrency: PricingCurrency): string => {
  const discounted = usdAmount * pricingCurrency.discount
  const fxRate = DISPLAY_FX_RATES[pricingCurrency.currencyCode] || 1
  const localizedAmount = discounted * fxRate
  const noDecimals = ["JPY", "KRW", "VND", "IDR", "COP", "NGN"]
  return new Intl.NumberFormat(pricingCurrency.locale, {
    style: "currency",
    currency: pricingCurrency.currencyCode,
    maximumFractionDigits: noDecimals.includes(pricingCurrency.currencyCode) ? 0 : 2,
  }).format(localizedAmount)
}

export const formatUsdPrice = (usdAmount: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(usdAmount)
