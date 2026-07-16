import { toPng } from "html-to-image"
import JSZip from "jszip"
import { PDFDocument } from "pdf-lib"

export async function captureSlide(element: HTMLElement): Promise<string> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 1,
    skipAutoScale: true,
  })
  return dataUrl.split(",")[1] ?? dataUrl
}

export type SlideCapture = {
  name: string
  base64: string
}

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

/**
 * Captures each slide as a PNG image and embeds it into a PDF, byte-for-byte
 * matching what's on screen (branding, photo, background, theme overrides
 * included) since those only exist as client-side render state - the server
 * has no way to reconstruct them.
 */
export async function captureCarouselPdfBytes(
  slideRefs: React.RefObject<HTMLDivElement | null>[]
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()

  for (let i = 0; i < slideRefs.length; i++) {
    const el = slideRefs[i].current
    if (!el) continue

    const dataUrl = await toPng(el, {
      cacheBust: true,
      pixelRatio: 2,
      skipAutoScale: true,
    })

    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "")
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))

    const pngImage = await pdf.embedPng(bytes)
    // 1080x1080 points (72dpi equivalent of the canvas)
    const page = pdf.addPage([1080, 1080])
    page.drawImage(pngImage, { x: 0, y: 0, width: 1080, height: 1080 })
  }

  return pdf.save()
}

/**
 * Generates a PDF by capturing each slide as a PNG image and embedding it.
 * This guarantees the PDF matches exactly what is shown on screen.
 */
export async function generateCarouselPdf(
  slideRefs: React.RefObject<HTMLDivElement | null>[],
  filename = "qalam-carousel"
): Promise<void> {
  const pdfBytes = await captureCarouselPdfBytes(slideRefs)
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
