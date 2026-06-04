import { toPng } from "html-to-image"
import JSZip from "jszip"

/**
 * Captures a DOM element as a PNG base64 string.
 * The element must be rendered (even off-screen) in the DOM.
 */
export async function captureSlide(element: HTMLElement): Promise<string> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 1,
    skipAutoScale: true,
  })
  // Strip the "data:image/png;base64," prefix
  return dataUrl.split(",")[1] ?? dataUrl
}

export type SlideCapture = {
  name: string
  base64: string
}

/**
 * Generates a ZIP file containing all slide PNGs and triggers a browser download.
 */
export async function generateCarouselZip(
  slideRefs: React.RefObject<HTMLDivElement | null>[],
  filename = "qalam-carousel"
): Promise<void> {
  const zip = new JSZip()
  const folder = zip.folder("slides")

  if (!folder) throw new Error("Failed to create ZIP folder")

  for (let i = 0; i < slideRefs.length; i++) {
    const el = slideRefs[i].current
    if (!el) continue
    const base64 = await captureSlide(el)
    folder.file(`slide-${String(i + 1).padStart(2, "0")}.png`, base64, { base64: true })
  }

  const blob = await zip.generateAsync({ type: "blob" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
