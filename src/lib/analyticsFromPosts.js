/**
 * Derive chart-friendly analytics from saved posts (no external LinkedIn API).
 */

export function inferPlatform(post) {
  const t = `${post.type || ''} ${post.title || ''} ${post.category || ''}`
  if (/linkedin/i.test(t)) return 'linkedin'
  if (/twitter|threads/i.test(t)) {
    return /threads/i.test(t) ? 'threads' : 'twitter'
  }
  return 'linkedin'
}

export function wordCount(post) {
  const c = post.content || ''
  if (!c.trim()) return 0
  return c.trim().split(/\s+/).length
}

export function parseEngagementPct(post) {
  const e = post.engagement
  if (typeof e !== 'string') return null
  const m = e.match(/([\d.]+)\s*%/)
  if (!m) return null
  const v = parseFloat(m[1])
  return Number.isFinite(v) ? v : null
}

function generateDayLabels(n) {
  const days = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    days.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
  }
  return days
}

function dayLabelFromPost(post) {
  if (post.createdAt && typeof post.createdAt === 'number') {
    const d = new Date(post.createdAt)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return post.date || null
}

export function buildWordsReachSeries(posts, range) {
  const n = range === '7D' ? 7 : range === '30D' ? 30 : 90
  const labels = generateDayLabels(n)
  const idx = Object.fromEntries(labels.map((d, i) => [d, i]))

  const rows = labels.map((date) => ({
    date,
    linkedin: 0,
    twitter: 0,
    threads: 0,
    all: 0,
  }))

  for (const p of posts) {
    const label = dayLabelFromPost(p)
    if (label == null || idx[label] === undefined) continue
    const w = wordCount(p)
    if (w <= 0) continue
    const plat = inferPlatform(p)
    const row = rows[idx[label]]
    row[plat] += w
    row.all += w
  }

  return rows
}

export function buildEngagementSeries(posts, range) {
  const n = range === '7D' ? 7 : range === '30D' ? 30 : 90
  const labels = generateDayLabels(n)
  const idx = Object.fromEntries(labels.map((d, i) => [d, i]))

  const sums = labels.map(() => ({ linkedin: [0, 0], twitter: [0, 0], threads: [0, 0], all: [0, 0] }))

  for (const p of posts) {
    if (p.status !== 'published') continue
    const label = dayLabelFromPost(p)
    if (label == null || idx[label] === undefined) continue
    const pct = parseEngagementPct(p)
    if (pct == null) continue
    const plat = inferPlatform(p)
    const i = idx[label]
    sums[i][plat][0] += pct
    sums[i][plat][1] += 1
    sums[i].all[0] += pct
    sums[i].all[1] += 1
  }

  return labels.map((date, i) => {
    const avg = (pair) => (pair[1] ? +(pair[0] / pair[1]).toFixed(2) : 0)
    return {
      date,
      linkedin: avg(sums[i].linkedin),
      twitter: avg(sums[i].twitter),
      threads: avg(sums[i].threads),
      all: avg(sums[i].all),
    }
  })
}

export function buildPostsVolumeSeries(posts, range) {
  const n = range === '7D' ? 7 : range === '30D' ? 30 : 90
  const labels = generateDayLabels(n)
  const idx = Object.fromEntries(labels.map((d, i) => [d, i]))

  const rows = labels.map((date) => ({
    date,
    linkedin: 0,
    twitter: 0,
    threads: 0,
    all: 0,
  }))

  for (const p of posts) {
    const label = dayLabelFromPost(p)
    if (label == null || idx[label] === undefined) continue
    const plat = inferPlatform(p)
    const row = rows[idx[label]]
    row[plat] += 1
    row.all += 1
  }

  return rows
}

const HOUR_SLOTS = [
  { hour: '6am', h: 6 },
  { hour: '8am', h: 8 },
  { hour: '10am', h: 10 },
  { hour: '12pm', h: 12 },
  { hour: '2pm', h: 14 },
  { hour: '4pm', h: 16 },
  { hour: '6pm', h: 18 },
  { hour: '8pm', h: 20 },
]

/** Activity distribution by hour from post timestamps (proxy for “best times”). */
export function buildBestTimesFromPosts(posts) {
  const counts = Array(24).fill(0)
  for (const p of posts) {
    if (!p.createdAt) continue
    counts[new Date(p.createdAt).getHours()] += 1
  }
  const peak = Math.max(...counts, 1)
  return HOUR_SLOTS.map(({ hour, h }) => {
    const v = counts[h] + (counts[h + 1] || 0)
    const norm = 2 + (v / peak) * 3.2
    const li = +norm.toFixed(1)
    return { hour, li, tw: +(norm * 0.88).toFixed(1), th: +(norm * 0.95).toFixed(1) }
  })
}

export function buildTopPostsList(posts, platformFilter) {
  const published = posts.filter((p) => p.status === 'published')
  const mapped = published.map((p) => {
    const plat = inferPlatform(p)
    const eng = parseEngagementPct(p)
    const words = wordCount(p)
    const reachEst = Math.max(120, Math.round(words * 42))
    return {
      title: p.title || 'Untitled',
      platform: plat,
      reach: reachEst >= 1000 ? `${(reachEst / 1000).toFixed(1)}K` : String(reachEst),
      engagement: eng != null ? `${eng.toFixed(1)}%` : '—',
      change: eng != null && eng >= 4 ? 'up' : eng != null && eng < 3 ? 'down' : 'flat',
      sortKey: eng ?? 0,
    }
  })
  const filtered =
    platformFilter === 'all'
      ? mapped
      : mapped.filter((p) => p.platform === platformFilter)
  return filtered.sort((a, b) => b.sortKey - a.sortKey).slice(0, 8)
}
