import { getFontEmbedCSS, toSvg } from "html-to-image"

/**
 * Node-to-PNG capture.
 *
 * html-to-image's own `toPng` is not used for the rasterising half. Its image
 * loader resolves inside a `requestAnimationFrame` callback and calls
 * `img.decode()` with no rejection handler, so the promise never settles while
 * the page is not being painted - a backgrounded tab, a minimised window, a
 * phone with the browser off screen. An export started in that state hung
 * forever behind a spinner with no error, which is the failure people report
 * as "the download does nothing". Its serialising half, `toSvg`, is sound and
 * is still used.
 *
 * Font CSS is also resolved once and reused. html-to-image re-reads every
 * stylesheet and re-fetches every webfont per call, so a multi-slide export
 * paid that cost once per slide.
 */

const CAPTURE_TIMEOUT_MS = 30_000

let fontEmbedCssPromise: Promise<string> | null = null

/** Resolves the page font CSS once per session. Safe to call repeatedly. */
export function loadFontEmbedCss(element: HTMLElement): Promise<string> {
  if (!fontEmbedCssPromise) {
    fontEmbedCssPromise = getFontEmbedCSS(element).catch(() => "")
  }
  return fontEmbedCssPromise
}

/** Drops the cached font CSS. Only needed if the page swaps fonts at runtime. */
export function resetFontEmbedCss(): void {
  fontEmbedCssPromise = null
}

function withTimeout<T>(work: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error(`${label} timed out after ${CAPTURE_TIMEOUT_MS / 1000} seconds.`)),
      CAPTURE_TIMEOUT_MS
    )
    work.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timer)
        reject(error)
      }
    )
  })
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = "async"
    image.onload = () => {
      // decode() is a hint, not a requirement. A rejection still leaves a
      // drawable image, so it must not sink the whole capture.
      image.decode().then(
        () => resolve(image),
        () => resolve(image)
      )
    }
    image.onerror = () => reject(new Error("The rendered slide could not be loaded as an image."))
    image.src = url
  })
}

async function rasterise(element: HTMLElement, svgUrl: string, pixelRatio: number): Promise<string> {
  const image = await loadImage(svgUrl)
  const width = element.offsetWidth || image.naturalWidth
  const height = element.offsetHeight || image.naturalHeight

  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(width * pixelRatio))
  canvas.height = Math.max(1, Math.round(height * pixelRatio))

  const context = canvas.getContext("2d")
  if (!context) throw new Error("This browser did not provide a 2D canvas context.")
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  return canvas.toDataURL("image/png")
}

export async function nodeToPngDataUrl(element: HTMLElement, pixelRatio = 1): Promise<string> {
  const fontEmbedCSS = await loadFontEmbedCss(element)
  const capture = async (options: { fontEmbedCSS?: string; skipFonts?: boolean }) =>
    rasterise(element, await toSvg(element, options), pixelRatio)

  try {
    return await withTimeout(capture({ fontEmbedCSS }), "Image capture")
  } catch {
    // Without embedded fonts the render falls back to system faces, which is a
    // worse image but a real one. Preferable to handing back nothing.
    return withTimeout(capture({ skipFonts: true }), "Image capture")
  }
}
