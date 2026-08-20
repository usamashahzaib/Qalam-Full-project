import "server-only"

import mammoth from "mammoth"
import JSZip from "jszip"
import { redactSensitiveResumeText } from "@/lib/professional-context"

export const MAX_RESUME_DOCX_BYTES = 5 * 1024 * 1024
export const MAX_RESUME_DOCX_ENTRIES = 256
export const MAX_RESUME_DOCX_EXPANDED_BYTES = 20 * 1024 * 1024
export const MAX_RESUME_DOCX_COMPRESSION_RATIO = 100

const DOCX_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04])

export type ResumeDocxText = {
  text: string
}

export async function extractResumeDocxText(file: File): Promise<ResumeDocxText> {
  const validType =
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx")
  if (!validType) throw new Error("resume_docx_type_invalid")
  if (file.size < DOCX_SIGNATURE.length) throw new Error("resume_docx_empty")
  if (file.size > MAX_RESUME_DOCX_BYTES) throw new Error("resume_docx_too_large")

  const bytes = Buffer.from(await file.arrayBuffer())
  if (!bytes.subarray(0, DOCX_SIGNATURE.length).equals(DOCX_SIGNATURE)) {
    throw new Error("resume_docx_signature_invalid")
  }

  try {
    const archive = await JSZip.loadAsync(bytes)
    const entries = Object.values(archive.files)
    if (entries.length > MAX_RESUME_DOCX_ENTRIES) throw new Error("resume_docx_archive_too_large")
    let expandedBytes = 0
    for (const entry of entries) {
      if (entry.dir) continue
      const metadata = entry as typeof entry & { _data?: { uncompressedSize?: number; compressedSize?: number } }
      const uncompressedSize = metadata._data?.uncompressedSize
      const compressedSize = metadata._data?.compressedSize
      if (typeof uncompressedSize !== "number" || typeof compressedSize !== "number") {
        throw new Error("resume_docx_archive_invalid")
      }
      expandedBytes += uncompressedSize
      if (expandedBytes > MAX_RESUME_DOCX_EXPANDED_BYTES) throw new Error("resume_docx_archive_too_large")
      if (uncompressedSize > 0 && uncompressedSize / Math.max(1, compressedSize) > MAX_RESUME_DOCX_COMPRESSION_RATIO) {
        throw new Error("resume_docx_archive_too_large")
      }
    }
  } catch (error) {
    if ((error as Error).message === "resume_docx_archive_too_large") throw error
    throw new Error("resume_docx_archive_invalid")
  }

  let raw: string
  try {
    const result = await mammoth.extractRawText({ buffer: bytes })
    raw = result.value || ""
  } catch {
    throw new Error("resume_docx_parse_failed")
  }

  const text = redactSensitiveResumeText(raw)
  if (text.length < 120) throw new Error("resume_docx_text_missing")
  return { text }
}
