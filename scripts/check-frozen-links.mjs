// Crawls the pages listed in a running site's sitemap and fails if any internal link points at a
// surface paused in lib/frozen-surfaces.ts. A link like that sends a visitor to a redirect.
//
// Run against a production build:
//   npx next build && npx next start -p 3001
//   npm run check:frozen-links            (defaults to http://localhost:3001)
//   npm run check:frozen-links -- https://staging.example.com

const { isFrozenPath } = await import("../lib/frozen-surfaces.ts")

const base = (process.argv[2] || "http://localhost:3001").replace(/\/$/, "")

const get = async (path) => {
  const response = await fetch(`${base}${path}`, { redirect: "manual", signal: AbortSignal.timeout(30_000) })
  return { status: response.status, text: response.status === 200 ? await response.text() : "" }
}

const sitemap = await get("/sitemap.xml")
if (sitemap.status !== 200) {
  console.error(`Could not read ${base}/sitemap.xml (status ${sitemap.status}). Is the site running?`)
  process.exit(1)
}

const pages = [...new Set([...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => {
  try { return new URL(match[1]).pathname } catch { return match[1] }
}))]

const problems = []
const pageSet = new Set(pages)
for (const path of ["/", "/llms.txt", "/llms-full.txt", ...pages]) {
  if (isFrozenPath(path) && pageSet.has(path)) problems.push(`sitemap lists a paused page: ${path}`)
  const { status, text } = await get(path)
  if (status !== 200) continue
  const links = new Set([
    ...[...text.matchAll(/href="(\/[^"#?]*)/g)].map((match) => match[1]),
    ...[...text.matchAll(/https?:\/\/(?:www\.)?byqalam\.com(\/[^\s"')<>]*)/g)].map((match) => match[1]),
  ])
  for (const link of links) {
    const clean = link.split(/[?#]/)[0]
    if (clean !== "/" && isFrozenPath(clean)) problems.push(`${path} links to paused ${clean}`)
  }
}

if (problems.length) {
  console.error(`${problems.length} link(s) lead to paused pages:`)
  for (const problem of [...new Set(problems)].slice(0, 60)) console.error(`  ${problem}`)
  process.exit(1)
}
console.log(`Checked ${pages.length + 3} pages. No links to paused surfaces.`)
