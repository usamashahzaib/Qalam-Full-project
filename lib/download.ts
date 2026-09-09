/**
 * Browser download helpers.
 *
 * Every download in the app funnels through here because the naive version
 * (create an anchor, click it, revoke the object URL on the next line) fails
 * silently in real browsers: the anchor has to be in the document for the
 * click to count as a user-initiated download, and revoking the object URL
 * before the browser has finished reading it aborts the transfer. Both
 * failures look identical to the user - the button flashes and no file
 * appears - so they are easy to ship and hard to report.
 */

const REVOKE_DELAY_MS = 60_000

export function sanitizeFilename(value: string, fallback: string): string {
  const stem = value
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80)
  return stem || fallback
}

/** Clicks a real, attached anchor so the browser treats this as a download. */
export function triggerDownload(href: string, filename: string): void {
  if (typeof document === "undefined") return
  const anchor = document.createElement("a")
  anchor.href = href
  anchor.download = filename
  anchor.rel = "noopener"
  anchor.style.display = "none"
  document.body.appendChild(anchor)
  anchor.click()
  // Detaching synchronously can cancel the download in WebKit, so let the
  // current task finish first.
  window.setTimeout(() => anchor.remove(), 0)
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  triggerDownload(url, filename)
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}

/** Wraps raw bytes in a correctly sized Blob. Passing `bytes.buffer` is wrong
 * whenever the view does not span the whole ArrayBuffer. */
export function downloadBytes(bytes: Uint8Array, filename: string, mimeType: string): void {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  downloadBlob(new Blob([copy], { type: mimeType }), filename)
}

export function downloadText(text: string, filename: string, mimeType = "text/plain;charset=utf-8"): void {
  downloadBlob(new Blob([text], { type: mimeType }), filename)
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  triggerDownload(dataUrl, filename)
}
