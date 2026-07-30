import "server-only"

import mammoth from "mammoth"
import { redactSensitiveResumeText } from "@/lib/professional-context"

export const MAX_RESUME_DOCX_BYTES = 5 * 1024 * 1024

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
