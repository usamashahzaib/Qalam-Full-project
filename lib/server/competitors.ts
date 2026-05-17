import { groqApiKey } from "@/lib/server/env"

export const analyzeCompetitorPaste = async ({
  sourceText = "",
  profileName = "",
}: {
  sourceText?: string
  profileName?: string
}) => {
  if (!groqApiKey) {
    return {
      summary: `${profileName || "This profile"} analysis unavailable.`,
      themes: [],
      hooks: [],
      ctas: [],
      cadence: "Unknown",
      recommendation: "AI generation is not configured on this server.",
    }
  }

  const prompt = `You are a world-class LinkedIn ghostwriter and analyst. Analyze the following LinkedIn posts/profile text from a competitor named "${profileName || "Competitor"}".

Return a JSON object with the following schema exactly (NO markdown wrapping, just the raw JSON):
{
  "summary": "A 2-sentence elite analysis of their strategy.",
  "themes": [{"topic": "Topic Name", "count": 1}], // Up to 4 core themes
  "hooks": ["Hook 1", "Hook 2"], // Extract their best 2-3 hooks (first lines)
  "ctas": ["CTA 1", "CTA 2"], // Extract their best 2-3 Calls to Action
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
    
    // Attempt to parse JSON safely
    const parsed = JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim())
    
    return {
      summary: parsed.summary || "Analysis complete.",
      themes: parsed.themes || [],
      hooks: parsed.hooks || [],
      ctas: parsed.ctas || [],
      cadence: parsed.cadence || "Mixed",
      recommendation: parsed.recommendation || "Maintain your unique voice.",
    }
  } catch (error) {
    return {
      summary: "AI Analysis failed to process the text.",
      themes: [],
      hooks: [],
      ctas: [],
      cadence: "Unknown",
      recommendation: "Please try again later.",
    }
  }
}
