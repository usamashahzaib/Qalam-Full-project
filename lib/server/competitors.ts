import { groqApiKey } from "@/lib/server/env"
import { sanitizeGeneratedText } from "@/lib/content-guard"

const NOISE_PATTERNS = [
  /^(compose message|compose post|message|send message)$/i,
  /^(search|home|network|my network|jobs|messaging|notifications|me|for business|premium|try premium)$/i,
  /^(view profile|see all activity|show all posts|follow|connect|message|more)$/i,
  /^(page inboxes|you are on the messaging overlay|press enter|click to see)/i,
  /^(advertisement|promoted|suggested for you)$/i,
  /^(linkedin corporation|terms|privacy|cookie|accessibility)$/i,
]

const cleanSource = (value: string) =>
  sanitizeGeneratedText(value)
    .replace(/\t+/g, " ")
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line && line.length > 2 && !NOISE_PATTERNS.some((pattern) => pattern.test(line)))
    .filter((line, index, lines) => lines.indexOf(line) === index)
    .join("\n")

const takeMatches = (text: string, regex: RegExp, limit: number) => {
  const hits = [...text.matchAll(regex)]
    .map((match) => match[0]?.trim())
    .filter((value): value is string => Boolean(value))
  return [...new Set(hits)].slice(0, limit)
}

const keywordThemes = (text: string) => {
  const signals = [
    ["AI and automation", /\bai\b|automation|machine learning|llm|workflow/i],
    ["Leadership", /leader|manager|team|culture|executive/i],
    ["Hiring and talent", /hire|recruit|talent|candidate|job/i],
    ["Growth and strategy", /strategy|positioning|growth|pipeline|revenue/i],
    ["Content and brand", /post|voice|brand|linkedin|audience/i],
    ["People operations", /employee|hr|people|performance|onboarding/i],
  ] as const
  return signals.filter(([, re]) => re.test(text)).map(([topic]) => ({ topic, count: 1 })).slice(0, 6)
}

const inferTone = (text: string) => {
  if (/\bi\b|\bmy\b|\bwe\b/.test(text) && /\d|client|team|hired|built|learned/i.test(text)) return "First-person, experience-led, practical"
  if (/\?/.test(text) && /why|how|what/i.test(text)) return "Curious, teaching-led, engagement-aware"
  if (/must|should|need to|stop|start/i.test(text)) return "Directive, opinion-led, high-conviction"
  return "Mixed tone with practical LinkedIn formatting"
}

const inferCadence = (text: string) => {
  const lines = text.split("\n").filter(Boolean)
  if (lines.length >= 12) return "Short-line format with mobile-first spacing"
  if (/\n\n/.test(text)) return "Paragraph-led with clean spacing and medium depth"
  return "Compressed format. Likely copied from profile chrome or short posts."
}

const inferAudience = (text: string) => {
  const guesses = [
    ["HR and people leaders", /hr|people|culture|talent|hiring|employee/i],
    ["Founders and operators", /founder|startup|operator|revenue|growth|pipeline/i],
    ["Managers and team leads", /manager|leadership|team|performance/i],
    ["Marketers and brand builders", /brand|content|campaign|audience|marketing/i],
  ] as const
  return guesses.filter(([, re]) => re.test(text)).map(([label]) => label).slice(0, 3)
}

const inferAuthoritySignals = (text: string) => {
  const items = [
    /\d/.test(text) ? "Uses numbers, counts, or hard signals" : "",
    /client|team|candidate|operator|leader/i.test(text) ? "Grounds points in real operating context" : "",
    /learned|failed|tested|built|hired|fired|saw|noticed/i.test(text) ? "Leans on lived experience instead of abstract advice" : "",
    /founder|head|director|manager|consultant|advisor/i.test(text) ? "Role-based authority is visible" : "",
  ].filter(Boolean)
  return items.slice(0, 4)
}

const inferContentGaps = (text: string) => {
  const gaps = [
    !/\d/.test(text) ? "Needs more hard proof - few metrics or quantified results show up" : "",
    !/because|so that|therefore|result/i.test(text) ? "Claims appear without enough reasoning or consequence framing" : "",
    !/comment|follow|dm|message|what do you think|let me know/i.test(text) ? "Weak direct CTA pattern - engagement ask is inconsistent" : "",
    !/mistake|failed|lesson|learned/i.test(text) ? "Low vulnerability signal - little personal risk or lesson framing" : "",
  ].filter(Boolean)
  return gaps.slice(0, 4)
}

const inferOpportunities = (text: string) => {
  const ideas = [
    /leadership|team|manager/i.test(text) ? "Translate their leadership claims into one sharper operational example from your own work" : "",
    /ai|automation/i.test(text) ? "Counter generic AI talk with one real workflow, before-and-after shift, or adoption mistake" : "",
    /hiring|talent|candidate/i.test(text) ? "Move from advice to proof - show one hiring tradeoff, scorecard, or miss you fixed" : "",
    "Use a tighter hook, one stronger counter-claim, and a shorter CTA than the source profile",
  ].filter(Boolean)
  return ideas.slice(0, 4)
}

const inferIdeas = (text: string) => {
  const ideas = [
    /leadership|manager|team/i.test(text) ? "Why most managers think clarity means repeating themselves - and why it usually signals a decision gap" : "",
    /hiring|talent|candidate/i.test(text) ? "The hiring signal I trust more than polished interview answers" : "",
    /ai|automation/i.test(text) ? "Where AI actually saves time in my workflow - and where it quietly makes judgment worse" : "",
    /content|brand|linkedin/i.test(text) ? "The content pattern that looks smart on LinkedIn but does nothing for trust" : "",
    "The advice everyone repeats in this niche - and the version that holds up in real work",
  ].filter(Boolean)
  return [...new Set(ideas)].slice(0, 5)
}

const fallbackAnalysis = (profileName: string, cleanedSource: string) => {
  const hookLines = cleanedSource
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line.length > 18)
    .slice(0, 5)
    .map((line) => line.slice(0, 140))

  return {
    summary: `${profileName || "This profile"} is showing enough signal to map themes and tone, but the paste still contains profile chrome. The strongest next move is to answer their main claim with one sharper point and one lived example.`,
    positioning: /founder|ceo|operator|builder/i.test(cleanedSource)
      ? "Positions as an operator with broad business advice and first-hand lessons."
      : "Positions as a practitioner sharing practical lessons and audience-facing advice.",
    tone: inferTone(cleanedSource),
    audienceClues: inferAudience(cleanedSource),
    themes: keywordThemes(cleanedSource),
    hooks: hookLines,
    ctas: takeMatches(cleanedSource, /(comment|follow|dm|message|let me know|what do you think)[^.!\n]*/gi, 4),
    cadence: inferCadence(cleanedSource),
    authoritySignals: inferAuthoritySignals(cleanedSource),
    contentGaps: inferContentGaps(cleanedSource),
    opportunityAngles: inferOpportunities(cleanedSource),
    counterContentIdeas: inferIdeas(cleanedSource),
    recommendation: "Take their strongest theme, disagree with one part of it, then support your view with a concrete example from your own work.",
  }
}

export const analyzeCompetitorPaste = async ({
  sourceText = "",
  profileName = "",
}: {
  sourceText?: string
  profileName?: string
}) => {
  const cleanedSource = cleanSource(sourceText)
  const fallbackResult = fallbackAnalysis(profileName, cleanedSource)

  if (!groqApiKey) {
    return {
      ...fallbackResult,
      summary: `${profileName || "This profile"} was analyzed with local fallback logic because AI analysis is not configured.`,
    }
  }

  const prompt = `You analyze noisy pasted LinkedIn profile text. The input may include copied page chrome, nav items, message overlays, notification text, and duplicated UI fragments.

Your job:
- Ignore LinkedIn UI noise
- Extract only real positioning, content strategy, and audience signals
- Write like a senior strategist, not like AI filler
- Return plain JSON only

Return this schema exactly:
{
  "summary": "2 sentences max",
  "positioning": "1 concise sentence",
  "tone": "1 concise sentence",
  "audienceClues": ["clue 1", "clue 2"],
  "themes": [{"topic": "Theme", "count": 1}],
  "hooks": ["hook 1"],
  "ctas": ["cta 1"],
  "cadence": "1 concise sentence",
  "authoritySignals": ["signal 1"],
  "contentGaps": ["gap 1"],
  "opportunityAngles": ["angle 1"],
  "counterContentIdeas": ["idea 1"],
  "recommendation": "1 concise sentence"
}

Competitor name: ${profileName || "Competitor"}

Text:
"""
${cleanedSource.slice(0, 7000)}
"""`

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    })

    if (!response.ok) throw new Error("AI analysis failed")

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || "{}"
    const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse((jsonMatch?.[0] || cleaned || "{}").trim()) as Record<string, unknown>

    const list = (value: unknown, limit: number) =>
      Array.isArray(value) ? value.map(String).map(sanitizeGeneratedText).filter(Boolean).slice(0, limit) : []

    const themes = Array.isArray(parsed.themes)
      ? parsed.themes
          .map((theme) => {
            if (!theme || typeof theme !== "object") return null
            const item = theme as { topic?: unknown; count?: unknown }
            const topic = sanitizeGeneratedText(String(item.topic || "")).slice(0, 60)
            if (!topic) return null
            return { topic, count: Number(item.count || 1) || 1 }
          })
          .filter((theme): theme is { topic: string; count: number } => Boolean(theme))
          .slice(0, 6)
      : fallbackResult.themes

    return {
      summary: sanitizeGeneratedText(String(parsed.summary || fallbackResult.summary)),
      positioning: sanitizeGeneratedText(String(parsed.positioning || fallbackResult.positioning)),
      tone: sanitizeGeneratedText(String(parsed.tone || fallbackResult.tone)),
      audienceClues: list(parsed.audienceClues, 4).length ? list(parsed.audienceClues, 4) : fallbackResult.audienceClues,
      themes,
      hooks: list(parsed.hooks, 6).length ? list(parsed.hooks, 6) : fallbackResult.hooks,
      ctas: list(parsed.ctas, 5),
      cadence: sanitizeGeneratedText(String(parsed.cadence || fallbackResult.cadence)),
      authoritySignals: list(parsed.authoritySignals, 4).length ? list(parsed.authoritySignals, 4) : fallbackResult.authoritySignals,
      contentGaps: list(parsed.contentGaps, 4).length ? list(parsed.contentGaps, 4) : fallbackResult.contentGaps,
      opportunityAngles: list(parsed.opportunityAngles, 4).length ? list(parsed.opportunityAngles, 4) : fallbackResult.opportunityAngles,
      counterContentIdeas: list(parsed.counterContentIdeas, 5).length ? list(parsed.counterContentIdeas, 5) : fallbackResult.counterContentIdeas,
      recommendation: sanitizeGeneratedText(String(parsed.recommendation || fallbackResult.recommendation)),
    }
  } catch {
    return fallbackResult
  }
}
