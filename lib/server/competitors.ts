import { groqApiKey } from "@/lib/server/env"

export const analyzeCompetitorPaste = async ({
  sourceText = "",
  profileName = "",
}: {
  sourceText?: string
  profileName?: string
}) => {
  const heuristicSummary = sourceText.trim().split(/\s+/).slice(0, 28).join(" ")
  const heuristicHooks = sourceText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((line) => line.slice(0, 120))

  const fallbackResult = {
    summary: heuristicSummary ? `Profile signal captured from pasted text. ${heuristicSummary}${heuristicSummary.endsWith(".") ? "" : "."}` : "Profile signal captured from pasted text.",
    themes: [],
    hooks: heuristicHooks,
    ctas: [],
    cadence: "Manual review fallback",
    recommendation: "Use one specific counter-claim, one real example, and a shorter CTA than the source profile.",
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
${sourceText.slice(0, 4000)}
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
      summary: parsed.summary || fallbackResult.summary,
      themes: parsed.themes || [],
      hooks: parsed.hooks || fallbackResult.hooks,
      ctas: parsed.ctas || [],
      cadence: parsed.cadence || "Mixed",
      recommendation: parsed.recommendation || fallbackResult.recommendation,
    }
  } catch {
    return fallbackResult
  }
}
