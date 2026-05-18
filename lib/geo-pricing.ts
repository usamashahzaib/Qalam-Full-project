export type PricingCurrency = {
  countryCode: string
  currencyCode: string
  locale: string
  rateFromUsd: number
  label: string
}

export const USD_PRICING_CURRENCY: PricingCurrency = {
  countryCode: "US",
  currencyCode: "USD",
  locale: "en-US",
  rateFromUsd: 1,
  label: "US Dollar",
}

const COUNTRY_CURRENCY_MAP: Record<string, PricingCurrency> = {
  PK: { countryCode: "PK", currencyCode: "PKR", locale: "en-PK", rateFromUsd: 278, label: "Pakistani Rupee" },
  IN: { countryCode: "IN", currencyCode: "INR", locale: "en-IN", rateFromUsd: 83.5, label: "Indian Rupee" },
  CN: { countryCode: "CN", currencyCode: "CNY", locale: "zh-CN", rateFromUsd: 7.24, label: "Chinese Yuan" },
  JP: { countryCode: "JP", currencyCode: "JPY", locale: "ja-JP", rateFromUsd: 155, label: "Japanese Yen" },
  GB: { countryCode: "GB", currencyCode: "GBP", locale: "en-GB", rateFromUsd: 0.79, label: "British Pound" },
  DE: { countryCode: "DE", currencyCode: "EUR", locale: "de-DE", rateFromUsd: 0.92, label: "Euro" },
  FR: { countryCode: "FR", currencyCode: "EUR", locale: "fr-FR", rateFromUsd: 0.92, label: "Euro" },
  ES: { countryCode: "ES", currencyCode: "EUR", locale: "es-ES", rateFromUsd: 0.92, label: "Euro" },
  IT: { countryCode: "IT", currencyCode: "EUR", locale: "it-IT", rateFromUsd: 0.92, label: "Euro" },
  NL: { countryCode: "NL", currencyCode: "EUR", locale: "nl-NL", rateFromUsd: 0.92, label: "Euro" },
  CA: { countryCode: "CA", currencyCode: "CAD", locale: "en-CA", rateFromUsd: 1.37, label: "Canadian Dollar" },
  AU: { countryCode: "AU", currencyCode: "AUD", locale: "en-AU", rateFromUsd: 1.52, label: "Australian Dollar" },
  NZ: { countryCode: "NZ", currencyCode: "NZD", locale: "en-NZ", rateFromUsd: 1.66, label: "New Zealand Dollar" },
  AE: { countryCode: "AE", currencyCode: "AED", locale: "en-AE", rateFromUsd: 3.67, label: "UAE Dirham" },
  SA: { countryCode: "SA", currencyCode: "SAR", locale: "ar-SA", rateFromUsd: 3.75, label: "Saudi Riyal" },
  SG: { countryCode: "SG", currencyCode: "SGD", locale: "en-SG", rateFromUsd: 1.35, label: "Singapore Dollar" },
}

const readCountryFromHeaders = (headerStore: Headers) => {
  const candidates = [
    headerStore.get("x-vercel-ip-country"),
    headerStore.get("cf-ipcountry"),
    headerStore.get("x-country-code"),
  ]
    .map((value) => value?.trim().toUpperCase() || "")
    .filter(Boolean)

  return candidates[0] || USD_PRICING_CURRENCY.countryCode
}

const readLocaleFromHeaders = (headerStore: Headers) =>
  headerStore
    .get("accept-language")
    ?.split(",")[0]
    ?.trim()
    ?.replace(/_/g, "-") || USD_PRICING_CURRENCY.locale

export const resolvePricingCurrency = (headerStore: Headers): PricingCurrency => {
  const countryCode = readCountryFromHeaders(headerStore)
  const match = COUNTRY_CURRENCY_MAP[countryCode]
  return match || { ...USD_PRICING_CURRENCY, locale: readLocaleFromHeaders(headerStore) }
}

export const formatLocalizedPrice = (usdAmount: number, pricingCurrency: PricingCurrency) => {
  const localizedAmount = usdAmount * pricingCurrency.rateFromUsd
  return new Intl.NumberFormat(pricingCurrency.locale, {
    style: "currency",
    currency: pricingCurrency.currencyCode,
    maximumFractionDigits: ["JPY", "KRW"].includes(pricingCurrency.currencyCode) ? 0 : 2,
  }).format(localizedAmount)
}

export const formatUsdPrice = (usdAmount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(usdAmount)
