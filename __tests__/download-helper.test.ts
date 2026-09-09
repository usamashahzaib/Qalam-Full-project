import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// The previous call sites built a detached anchor and revoked the object URL on
// the next line. Both make the browser drop the download with no error at all,
// which is what "the download button does nothing" turns out to be. These
// assert the two properties that make a download actually happen.
//
// The suite runs in the node environment, so the handful of DOM surfaces the
// helper touches are stubbed rather than pulling in a browser environment.

type FakeAnchor = {
  href: string
  download: string
  rel: string
  style: { display: string }
  click: () => void
  remove: () => void
}

let attachedAnchors: FakeAnchor[] = []
let clicked: { attached: boolean; href: string; download: string } | null = null
let revoked: string[] = []
let created: FakeAnchor[] = []

beforeEach(async () => {
  vi.useFakeTimers()
  attachedAnchors = []
  created = []
  clicked = null
  revoked = []

  const makeAnchor = (): FakeAnchor => {
    const anchor: FakeAnchor = {
      href: "",
      download: "",
      rel: "",
      style: { display: "" },
      click: () => {
        clicked = {
          attached: attachedAnchors.includes(anchor),
          href: anchor.href,
          download: anchor.download,
        }
      },
      remove: () => {
        attachedAnchors = attachedAnchors.filter((item) => item !== anchor)
      },
    }
    created.push(anchor)
    return anchor
  }

  const documentStub = {
    createElement: (tag: string) => {
      if (tag !== "a") throw new Error(`unexpected element ${tag}`)
      return makeAnchor()
    },
    body: {
      appendChild: (anchor: FakeAnchor) => {
        attachedAnchors.push(anchor)
        return anchor
      },
    },
  }

  vi.stubGlobal("document", documentStub)
  vi.stubGlobal("window", {
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
  })
  // Patch the two methods rather than replacing URL, which vitest itself uses.
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url")
  vi.spyOn(URL, "revokeObjectURL").mockImplementation((url: string) => {
    revoked.push(url)
  })

  vi.resetModules()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const load = () => import("@/lib/download")

describe("download helper", () => {
  it("clicks an anchor that is attached to the document", async () => {
    const { triggerDownload } = await load()
    triggerDownload("blob:mock-url", "report.pdf")

    expect(clicked).toMatchObject({ attached: true, download: "report.pdf", href: "blob:mock-url" })
  })

  it("removes the anchor only after the click task has finished", async () => {
    const { triggerDownload } = await load()
    triggerDownload("blob:mock-url", "report.pdf")

    expect(attachedAnchors).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(attachedAnchors).toHaveLength(0)
  })

  it("does not revoke the object URL while the browser is still reading it", async () => {
    const { downloadBlob } = await load()
    downloadBlob(new Blob(["x"], { type: "application/pdf" }), "resume.pdf")

    expect(clicked).toMatchObject({ attached: true, download: "resume.pdf" })
    expect(revoked).toEqual([])

    vi.advanceTimersByTime(60_000)
    expect(revoked).toEqual(["blob:mock-url"])
  })

  it("downloads text with the requested filename", async () => {
    const { downloadText } = await load()
    downloadText("a,b\n1,2", "rows.csv", "text/csv;charset=utf-8;")

    expect(clicked).toMatchObject({ download: "rows.csv" })
    expect(created).toHaveLength(1)
  })
})
