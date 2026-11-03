import { describe, expect, it } from "vitest"
import { PDFDocument } from "pdf-lib"
import { BRAND_PRESETS, DECK_HEIGHT, DECK_WIDTH, UnsupportedScriptError, brandKitFrom, buildDeckPdf, checkSlides } from "@/lib/carousel-deck"

const good = [
  { title: "We lost our biggest client", body: "It was not the price." },
  { title: "The warning we ignored", body: "Replies slowed for three weeks before anyone said anything." },
  { title: "What we should have asked", body: "One direct question on the first slow week." },
  { title: "The fix was small", body: "A standing monthly call. Fifteen minutes, no slides." },
  { title: "Ask early", body: "Silence is data. Treat it like a complaint." },
]

describe("carousel checks", () => {
  it("passes a short, specific deck", () => {
    expect(checkSlides(good)).toEqual([])
  })

  it("flags a thin deck, a long cover, a textbook cover and walls of text", () => {
    const codes = (slides: typeof good) => checkSlides(slides).map((issue) => issue.code)
    expect(codes(good.slice(0, 3))).toContain("too_few")
    expect(codes([{ title: "A very long cover title that keeps going well past a glance", body: "" }, ...good.slice(1)])).toContain("cover_long")
    expect(codes([{ title: "What is client retention", body: "" }, ...good.slice(1)])).toContain("cover_generic")
    expect(codes([...good.slice(0, 1), { title: "Wall", body: Array(40).fill("word").join(" ") }, ...good.slice(2)])).toContain("too_long")
  })

  it("flags engagement bait, empty slides and repeated titles", () => {
    const issues = checkSlides([
      ...good.slice(0, 3),
      { title: "Follow for more", body: "" },
      { title: "", body: "" },
      { title: "The warning we ignored", body: "again" },
    ])
    const found = issues.map((issue) => `${issue.slide}:${issue.code}`)
    expect(found).toContain("4:bait")
    expect(found).toContain("5:empty")
    expect(found).toContain("6:duplicate")
  })
})

describe("brand kit", () => {
  it("keeps only known accents and trims the footer", () => {
    expect(brandKitFrom({ accent: "#BE123C", footer: "  Ada Lovelace  " })).toEqual({ accent: "#BE123C", footer: "Ada Lovelace" })
    expect(brandKitFrom({ accent: "#123456" }).accent).toBe(BRAND_PRESETS[0].hex)
    expect(brandKitFrom(null)).toEqual({ accent: BRAND_PRESETS[0].hex, footer: "" })
  })
})

describe("deck PDF", () => {
  it("cuts one 4:5 page per slide", async () => {
    const bytes = await buildDeckPdf(good, { accent: "#1D4ED8", footer: "Ada Lovelace" })
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBe(good.length)
    for (const page of pdf.getPages()) expect(page.getSize()).toEqual({ width: DECK_WIDTH, height: DECK_HEIGHT })
    expect(DECK_WIDTH / DECK_HEIGHT).toBeCloseTo(0.8)
  })

  it("prints curly quotes and ellipses instead of failing on them", async () => {
    await expect(buildDeckPdf([{ title: "It’s “the” point…", body: "" }], { accent: "#0D9488", footer: "" })).resolves.toBeInstanceOf(Uint8Array)
  })

  it("refuses a script the standard fonts cannot print", async () => {
    await expect(buildDeckPdf([{ title: "مرحبا بالعالم", body: "" }], { accent: "#0D9488", footer: "" })).rejects.toBeInstanceOf(UnsupportedScriptError)
  })
})
