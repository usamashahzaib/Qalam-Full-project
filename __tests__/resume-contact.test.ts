import { describe, expect, it } from "vitest"
import { extractResumeContact } from "@/lib/resume-contact"
import { sanitizeFilename } from "@/lib/download"

const RESUME = `Ayesha Khan
Lahore, Pakistan
ayesha.khan@example.com | +92 300 1234567
linkedin.com/in/ayesha-khan

PROFESSIONAL SUMMARY
Backend engineer with eight years across payments and infrastructure.

EXPERIENCE
Backend Engineer, Acme Payments
2020 - 2024
Handled 1200000 transactions per month.
`

describe("resume contact extraction", () => {
  it("lifts the contact block out of raw resume text", () => {
    const contact = extractResumeContact(RESUME)

    expect(contact.fullName).toBe("Ayesha Khan")
    expect(contact.email).toBe("ayesha.khan@example.com")
    expect(contact.phone).toContain("300 1234567")
    expect(contact.location).toBe("Lahore, Pakistan")
    expect(contact.linkedinUrl).toBe("https://linkedin.com/in/ayesha-khan")
  })

  it("does not mistake a section heading for a name", () => {
    expect(extractResumeContact("CURRICULUM VITAE\nPROFESSIONAL SUMMARY\nSenior engineer.").fullName).toBe("")
  })

  it("ignores a long digit run further down the document", () => {
    const contact = extractResumeContact("Ayesha Khan\n\nEXPERIENCE\nHandled 1200000 transactions per month.")

    expect(contact.phone).toBe("")
  })

  it("returns empty fields rather than guesses for text with no contact block", () => {
    expect(extractResumeContact("Some prose with no contact details at all.")).toEqual({
      fullName: "",
      email: "",
      phone: "",
      location: "",
      linkedinUrl: "",
    })
  })
})

describe("download filenames", () => {
  it("strips characters that break a download and keeps a readable stem", () => {
    expect(sanitizeFilename("Ayesha Khan / Senior Engineer?", "ats-resume")).toBe("Ayesha-Khan-Senior-Engineer")
  })

  it("falls back when nothing usable is left", () => {
    expect(sanitizeFilename("///", "ats-resume")).toBe("ats-resume")
    expect(sanitizeFilename("", "carousel")).toBe("carousel")
  })

  it("never leaves a leading dot that would hide the file", () => {
    expect(sanitizeFilename(".hidden", "carousel").startsWith(".")).toBe(false)
  })
})
