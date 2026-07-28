import { describe, expect, it } from "vitest"
import { isValidLinkedInUrl, normalizeLinkedInUrl } from "@/lib/validation"

describe("LinkedIn URL validation", () => {
  it.each([
    "linkedin.com/in/usamashahzaib",
    "linkedin.com/in/usamashahzaib/",
    "https://linkedin.com/in/usamashahzaib/",
    "https://www.linkedin.com/in/usamashahzaib",
  ])("accepts and normalizes a public profile URL: %s", (value) => {
    expect(isValidLinkedInUrl(value)).toBe(true)
    expect(normalizeLinkedInUrl(value)).toBe("https://www.linkedin.com/in/usamashahzaib")
  })

  it("accepts company URLs and strips tracking parameters", () => {
    expect(normalizeLinkedInUrl("linkedin.com/company/byqalam/?trk=public_profile")).toBe(
      "https://www.linkedin.com/company/byqalam"
    )
  })

  it.each([
    "http://linkedin.com/in/usamashahzaib",
    "https://evil.example/in/usamashahzaib",
    "https://linkedin.com/posts/usamashahzaib",
    "https://linkedin.com/in/usamashahzaib/extra",
  ])("rejects non-public-profile input: %s", (value) => {
    expect(isValidLinkedInUrl(value)).toBe(false)
  })

  it("allows the optional field to stay empty", () => {
    expect(normalizeLinkedInUrl("")).toBe("")
  })
})
