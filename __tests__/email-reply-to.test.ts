import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/server/env", () => ({
  env: { resendApiKey: "re_test", transactionalEmailFrom: "Qalam <info@byqalam.com>" },
  supportEnv: { email: "info@byqalam.com" },
}))

import { sendTransactionalEmail } from "@/lib/server/email"

const fetchMock = vi.fn()

const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body as string)

describe("sendTransactionalEmail reply_to", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("defaults reply_to to the support inbox so replies to system mail land somewhere", async () => {
    const res = await sendTransactionalEmail({
      to: "user@example.com",
      subject: "Verify your email",
      text: "code",
    })

    expect(res.ok).toBe(true)
    expect(sentBody().reply_to).toBe("info@byqalam.com")
  })

  it("uses an explicit replyTo when the message is forwarded on someone's behalf", async () => {
    await sendTransactionalEmail({
      to: "info@byqalam.com",
      subject: "[Qalam Contact] Hello",
      text: "body",
      replyTo: '"Ayesha Khan" <ayesha@example.com>',
    })

    expect(sentBody().reply_to).toBe('"Ayesha Khan" <ayesha@example.com>')
  })

  it("falls back to support when replyTo is blank rather than sending an empty header", async () => {
    await sendTransactionalEmail({
      to: "user@example.com",
      subject: "Receipt",
      text: "body",
      replyTo: "   ",
    })

    expect(sentBody().reply_to).toBe("info@byqalam.com")
  })
})

describe("contact form reply-to sanitising", () => {
  // Mirrors the transform in app/api/contact/route.ts and app/api/managed/apply/route.ts.
  const build = (name: string, email: string) => {
    const clean = name.replace(/[<>"\r\n,;:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 78)
    return clean ? `"${clean}" <${email}>` : email
  }

  it("keeps an ordinary name intact", () => {
    expect(build("Ayesha Khan", "a@example.com")).toBe('"Ayesha Khan" <a@example.com>')
  })

  it("strips characters that would let a submitter forge extra header content", () => {
    const forged = build('Bad" <attacker@evil.com>, x', "real@example.com")
    expect(forged).toBe('"Bad attacker@evil.com x" <real@example.com>')
    expect(forged).not.toContain("<attacker@evil.com>")
  })

  it("drops CR/LF so a submitter cannot inject a new header line", () => {
    expect(build("Bad\r\nBcc: victim@example.com", "real@example.com"))
      .toBe('"Bad Bcc victim@example.com" <real@example.com>')
  })

  it("falls back to the bare address when the name sanitises to nothing", () => {
    expect(build(">>>", "real@example.com")).toBe("real@example.com")
  })
})
