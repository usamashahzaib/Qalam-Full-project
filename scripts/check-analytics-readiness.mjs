const validId = (value) => /^G-[A-Z0-9]{6,}$/.test((value || "").trim())

const deploymentEnv = (
  process.env.NEXT_PUBLIC_QALAM_ENV
  || process.env.NEXT_PUBLIC_VERCEL_ENV
  || "development"
).trim().toLowerCase()
const productionId = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "").trim()
const previewId = (process.env.NEXT_PUBLIC_GA_PREVIEW_MEASUREMENT_ID || "").trim()
const strictPreview = process.env.STRICT_ANALYTICS_READINESS === "1"

const failures = []
const warnings = []

if (productionId && previewId && productionId === previewId) {
  failures.push("Production and preview GA measurement IDs must be different.")
}

if (deploymentEnv === "production" && !validId(productionId)) {
  failures.push("Production builds require a valid NEXT_PUBLIC_GA_MEASUREMENT_ID.")
}

if (deploymentEnv === "preview" && !validId(previewId)) {
  const message = "Preview analytics is silent because NEXT_PUBLIC_GA_PREVIEW_MEASUREMENT_ID is missing or invalid."
  if (strictPreview) failures.push(message)
  else warnings.push(`${message} Set STRICT_ANALYTICS_READINESS=1 to make this fatal.`)
}

if (!["production", "preview", "development"].includes(deploymentEnv)) {
  warnings.push(`Unknown analytics environment '${deploymentEnv}'. Analytics will stay disabled.`)
}

for (const warning of warnings) console.warn(`analytics-readiness: WARN ${warning}`)
for (const failure of failures) console.error(`analytics-readiness: FAIL ${failure}`)

if (failures.length > 0) process.exit(1)

const active = deploymentEnv === "production"
  ? validId(productionId)
  : deploymentEnv === "preview" && validId(previewId)
console.log(`analytics-readiness: PASS environment=${deploymentEnv} active=${active}`)
