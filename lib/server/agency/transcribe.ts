import "server-only"

import { env } from "@/lib/server/env"

export const MAX_AUDIO_BYTES = 3_500_000
const ALLOWED_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-m4a", "audio/aac"]

export function isAllowedAudioType(type: string) {
  const base = type.split(";")[0].trim().toLowerCase()
  return ALLOWED_TYPES.includes(base)
}

/** Voice notes are transcribed and discarded. Only the reviewed text is stored. */
export async function transcribeVoiceNote(file: Blob, filename: string): Promise<string> {
  if (!env.groqApiKey) throw new Error("transcription_unavailable")
  const form = new FormData()
  form.append("file", file, filename)
  form.append("model", "whisper-large-v3-turbo")
  form.append("response_format", "json")
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.groqApiKey}` },
    body: form,
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`transcription_failed_${res.status}`)
  const data = await res.json() as { text?: string }
  const text = data.text?.trim() || ""
  if (!text) throw new Error("transcription_empty")
  return text.slice(0, 8000)
}
