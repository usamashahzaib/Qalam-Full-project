import { groqApiKey } from "@/lib/server/env"
import { sanitizeGeneratedText } from "@/lib/content-guard"

const cleanSource = (value: string) =>
  sanitizeGeneratedText(value)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !/^(compose message|you are on|press enter|page inboxes|notifications|search|home|jobs|messaging|click to see|my network|for business|premium)$/i.test(line))
    .join("\n")

const keywordThemes = (text: string) => {
  const signals = [
    ["AI", /\bAI\b|automation|machine learning/i],
    ["Leadership", /leader|manager|team|culture/i],
    ["Hiring", /hire|recruit|talent|candidate/i],
    ["Strategy", /strategy|positioning|growth|business/i],
    ["Content", /post|voice|brand|linkedin/i],
  ] as const
  return signals.filter(([, re]) => re.test(text)).map(([topic]) => ({ topic, count: 1 })).slice(0, 4)
}

export const analyzeCompetitorPaste = async ({
  sourceText = "",
  profileName = "",
}: {
  sourceText?: string
  profileName?: string
}) => {
  const cleanedSource = cleanSource(sourceText)
  const heuristicSummary = cleanedSource.trim().split(/\s+/).slice(0, 42).join(" ")
  const heuristicHooks = cleanedSource
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((line) => line.slice(0, 120))

  const fallbackResult = {
    summary: heuristicSummary ? `${profileName || "This profile"} is positioning around ${heuristicSummary}${heuristicSummary.endsWith(".") ? "" : "."}` : "Profile signal captured from pasted text.",
    themes: keywordThemes(cleanedSource),
    hooks: heuristicHooks,
    ctas: [],
    cadence: "Manual review fallback",
    recommendation: "Pick their strongest theme, make one sharper counter-claim, then prove it with a real example from your work.",
  }

  if (!groqApiKey) {
    return {
      ...fallbackResult,
      summary: `${profileName || "This profile"} analysis unavailable.`,
      recommendation: "AI generation is not configured on this server.",
    }
  }

  const prompt = `You are a world-class LinkedIn ghostwriter and analyst. Analyze the following LinkedIn posts/profile text from a competitor named "${profileName || "Competitor"}".

Return a JSON object with the following schema exactly (NO markdown wrapping, just the raw JSON):
{
  "summary": "A 2-sentence elite analysis of their strategy.",
  "themes": [{"topic": "Topic Name", "count": 1}],
  "hooks": ["Hook 1", "Hook 2"],
  "ctas": ["CTA 1", "CTA 2"],
  "cadence": "Short description of their formatting and cadence",
  "recommendation": "A sharp, contrarian angle I can use to out-position them on their strongest theme."
}

Text to analyze:
"""
${cleanedSource.slice(0, 4000)}
"""`

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    })

    if (!response.ok) throw new Error("AI analysis failed")

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || "{}"
    const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse((jsonMatch?.[0] || cleaned || "{}").trim())

    return {
      summary: sanitizeGeneratedText(parsed.summary || fallbackResult.summary),
      themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 6) : fallbackResult.themes,
      hooks: Array.isArray(parsed.hooks) ? parsed.hooks.map(String).map(sanitizeGeneratedText).slice(0, 6) : fallbackResult.hooks,
      ctas: Array.isArray(parsed.ctas) ? parsed.ctas.map(String).map(sanitizeGeneratedText).slice(0, 4) : [],
      cadence: sanitizeGeneratedText(parsed.cadence || "Mixed"),
      recommendation: sanitizeGeneratedText(parsed.recommendation || fallbackResult.recommendation),
    }
  } catch {
    return fallbackResult
  }
}
