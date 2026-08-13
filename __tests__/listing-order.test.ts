import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"
import { alphabetical } from "@/lib/sort"
import { MANAGED_PLANS } from "@/lib/pricing"

const isSorted = (values: string[]) =>
  values.every((v, i) => i === 0 || values[i - 1].localeCompare(v, "en") <= 0)

describe("alphabetical", () => {
  it("orders by the supplied key", () => {
    const out = alphabetical([{ n: "Beta" }, { n: "alpha" }, { n: "Gamma" }], (x) => x.n)
    expect(out.map((x) => x.n)).toEqual(["alpha", "Beta", "Gamma"])
  })

  it("does not mutate the input array", () => {
    const input = [{ n: "Zed" }, { n: "Abe" }]
    const copy = [...input]
    alphabetical(input, (x) => x.n)
    expect(input).toEqual(copy)
  })
})

describe("service listings are A-Z", () => {
  // The listings are module-private consts, so assert at the source level that
  // each one is still wrapped in the sort helper. Catches someone re-adding a
  // hand-ordered literal later.
  it.each([
    ["app/free-tools/page.tsx", "const TOOLS = alphabetical("],
    ["components/Navbar.tsx", "const PRODUCT_LINKS = alphabetical("],
    ["components/Navbar.tsx", "const USE_CASE_LINKS = alphabetical("],
    ["components/Footer.tsx", "Product: alphabetical("],
    ["components/Footer.tsx", '"Use Cases": alphabetical('],
  ])("%s applies alphabetical to %s", (file, marker) => {
    const src = readFileSync(resolve(__dirname, "..", file), "utf-8")
    expect(src).toContain(marker)
  })

  it("keeps managed packages A-Z, which also preserves cheapest-first pricing", () => {
    const names = MANAGED_PLANS.map((p) => p.name)
    expect(isSorted(names)).toBe(true)

    const prices = MANAGED_PLANS.map((p) => p.monthlyPrice)
    const ascending = prices.every((p, i) => i === 0 || prices[i - 1] <= p)
    expect(ascending).toBe(true)
  })
})
