// Sends one short prompt to every model in Qalam's NVIDIA chains and reports which answer.
// Run: npm run check:nvidia   (reads NVIDIA_API_KEY from .env.local)
// Pass model ids to check others: npm run check:nvidia -- stepfun-ai/step-5-preview

const WRITING = "moonshotai/kimi-k2.6,nvidia/nemotron-3-ultra-550b-a55b,mistralai/mistral-large-4-1t-a52b,z-ai/glm-5.3-flash"
const READING = "deepseek-ai/deepseek-v4.1-flash,nvidia/nemotron-3-super-120b-a12b,z-ai/glm-5.3-flash"

const key = process.env.NVIDIA_API_KEY
if (!key || key.startsWith("nvapi-...")) {
  console.error("NVIDIA_API_KEY is not set. Add it to .env.local first.")
  process.exit(1)
}

const fromArgs = process.argv.slice(2)
const models = fromArgs.length
  ? fromArgs
  : [...new Set([process.env.NVIDIA_WRITING_MODEL || WRITING, process.env.NVIDIA_READING_MODEL || READING].join(",").split(",").map((m) => m.trim()).filter(Boolean))]

let failures = 0
for (const model of models) {
  const started = Date.now()
  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Write one plain sentence about why short LinkedIn posts get read." }],
        max_tokens: 400,
        temperature: 0.5,
      }),
      signal: AbortSignal.timeout(60_000),
    })
    const seconds = ((Date.now() - started) / 1000).toFixed(1)
    if (!response.ok) {
      failures++
      console.log(`FAIL  ${model}  ${response.status} ${(await response.text()).slice(0, 160)}`)
      continue
    }
    const data = await response.json()
    const text = (data.choices?.[0]?.message?.content || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim()
    if (!text) failures++
    console.log(`${text ? "OK  " : "EMPTY"}  ${model}  ${seconds}s  ${text.replace(/\s+/g, " ").slice(0, 100)}`)
  } catch (error) {
    failures++
    console.log(`FAIL  ${model}  ${error.message}`)
  }
}

process.exit(failures ? 1 : 0)
