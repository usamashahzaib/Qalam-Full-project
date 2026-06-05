/**
 * Groq OpenAI-compatible chat completions (replaces Base44 InvokeLLM).
 * Set VITE_GROQ_API_KEY. For production, prefer a server-side proxy to avoid exposing keys.
 */
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

const defaultModel = () =>
  import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile';

function extractJsonObject(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * @param {{ prompt: string, response_json_schema?: object }} opts
 * @returns {Promise<string|object|null>}
 */
export async function invokeLLM({ prompt, response_json_schema: _schema }) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    console.error('Missing VITE_GROQ_API_KEY');
    throw new Error('AI is not configured. Add VITE_GROQ_API_KEY to your environment.');
  }

  const body = {
    model: defaultModel(),
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  };

  if (_schema) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `Groq request failed: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';

  if (_schema) {
    const parsed = extractJsonObject(content);
    if (parsed == null) {
      throw new Error('Model did not return valid JSON.');
    }
    return parsed;
  }

  return typeof content === 'string' ? content.trim() : String(content);
}

/**
 * Branded social imagery via Pollinations (no API key; suitable for drafts).
 * Replace with your image provider when you need production-grade assets.
 */
export async function generateImage({ prompt }) {
  const safe = String(prompt || '').slice(0, 500);
  const encoded = encodeURIComponent(safe);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=576&nologo=true&seed=${Date.now()}`;
  return { url };
}
