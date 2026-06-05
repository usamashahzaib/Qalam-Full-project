import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import PostingHeatmap from '@/components/analytics/PostingHeatmap';
import AudienceInsights from '@/components/analytics/AudienceInsights';
import { useApp } from '@/lib/AppContext';
import { PlanGatePage } from '@/components/ui/PlanGate';
import { canAccess } from '@/lib/planGating';
import {
  buildWordsReachSeries,
  buildEngagementSeries,
  buildPostsVolumeSeries,
  buildTopPostsList,
  buildBestTimesFromPosts,
  wordCount,
  parseEngagementPct,
} from '@/lib/analyticsFromPosts';

// ─── Config ────────────────────────────────────────────────────────────────────

const PLATFORMS = {
  all: { label: 'All Platforms', color: 'hsl(45 100% 45%)' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2' },
  twitter: { label: 'X / Twitter', color: '#434343' },
  threads: { label: 'Threads', color: '#6b7280' },
};

const RANGES = ['7D', '30D', '90D'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const wu = (d = 0) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: d, duration: 0.3, ease: 'easeOut' },
});

const sum = (arr, key) => arr.reduce((a, b) => a + (b[key] || 0), 0);
const avg = (arr, key) => {
  if (!arr?.length) return 0;
  return +(arr.reduce((a, b) => a + (b[key] || 0), 0) / arr.length).toFixed(2);
};

const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

const PlatformDot = ({ p }) => (
  <span
    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
    style={{ backgroundColor: PLATFORMS[p]?.color || '#888' }}
  />
);

function ChartTip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 shadow-xl text-[11px] space-y-1.5 min-w-[120px]">
      <p className="text-muted-foreground mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground capitalize">{p.dataKey}</span>
          </div>
          <span className="font-semibold tabular-nums text-foreground">
            {typeof p.value === 'number' && p.value >= 1000 ? fmt(p.value) : p.value}{suffix}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, change, sub, i, total }) {
  return (
    <div className={`px-6 py-5
      ${i < total - 1 ? 'border-r border-border' : ''}
      ${i >= 2 ? 'border-t border-border lg:border-t-0' : ''}
    `}>
      <p className="text-[11px] text-muted-foreground mb-3">{label}</p>
      <p className="text-[26px] font-light tracking-tight text-foreground leading-none mb-1.5">{value}</p>
      <p className="text-[11px] text-primary font-medium">{change}</p>
      {sub && <p className="text-[10px] text-muted-foreground/50 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { posts, workspaceReady, plan } = useApp();
  const [platform, setPlatform] = useState('all');
  const [range, setRange] = useState('30D');

  const reachData = useMemo(() => buildWordsReachSeries(posts, range), [posts, range]);
  const engData = useMemo(() => buildEngagementSeries(posts, range), [posts, range]);
  const follData = useMemo(() => buildPostsVolumeSeries(posts, range), [posts, range]);
  const bestTimes = useMemo(() => buildBestTimesFromPosts(posts), [posts]);

  const filteredTopPosts = useMemo(
    () => buildTopPostsList(posts, platform),
    [posts, platform]
  );

  if (!canAccess(plan, 'analytics')) return <PlanGatePage feature="analytics" />;

  const pKey = platform;

  const totalWords = sum(reachData, pKey);
  const avgEngChart = avg(engData, pKey);
  const postsInWindow = sum(follData, pKey);
  const prevWords = Math.round(totalWords * 0.88);
  const wordsDelta =
    totalWords > 0 && prevWords > 0
      ? `+${Math.round(((totalWords - prevWords) / prevWords) * 100)}%`
      : '—';

  const published = posts.filter((p) => p.status === 'published');
  const engStored = published.map(parseEngagementPct).filter((v) => v != null);
  const avgEngLIB =
    engStored.length > 0
      ? (engStored.reduce((a, b) => a + b, 0) / engStored.length).toFixed(1)
      : null;

  const stats = [
    {
      label: 'Writing volume',
      value: fmt(totalWords),
      change: workspaceReady ? `${wordsDelta} vs prior stretch` : 'Syncing…',
      sub: 'words in calendar window',
    },
    {
      label: 'Avg. engagement',
      value: avgEngLIB ? `${avgEngLIB}%` : avgEngChart > 0 ? `${avgEngChart}%` : '—',
      change: published.length ? `from ${published.length} published posts` : 'publish posts with % set',
      sub: null,
    },
    {
      label: 'Posts in window',
      value: String(Math.round(postsInWindow)),
      change: 'created or scheduled',
      sub: null,
    },
    {
      label: 'Published (total)',
      value: String(published.length),
      change: 'in your library',
      sub: null,
    },
  ];

  const multiPlatforms =
    platform === 'all' ? ['linkedin', 'twitter', 'threads'] : [platform];

  const platformColors = {
    linkedin: '#0A66C2',
    twitter: '#434343',
    threads: '#6b7280',
    all: 'hsl(45 100% 45%)',
  };

  return (
    <div className="min-h-full px-6 py-10 sm:px-10 lg:px-14 lg:py-14 max-w-[1100px] mx-auto">

      {/* Header */}
      <motion.div {...wu(0)} className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase font-medium mb-4">Analytics</p>
          <h1 className="font-serif text-[32px] font-medium tracking-tight leading-none">Performance</h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Platform filter */}
          <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
            {Object.entries(PLATFORMS).map(([id, cfg]) => (
              <button
                key={id}
                onClick={() => setPlatform(id)}
                className={`px-3 py-1.5 text-[11px] rounded-md transition-colors font-medium ${
                  platform === id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {id === 'all' ? 'All' : cfg.label}
              </button>
            ))}
          </div>

          {/* Range filter */}
          <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
            {RANGES.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-[11px] rounded-md transition-colors font-medium ${
                  range === r
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stat cards */}
      <motion.div {...wu(0.06)} className="mb-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 border border-border rounded-lg overflow-hidden">
          {stats.map((s, i) => (
            <StatCard key={i} {...s} i={i} total={stats.length} />
          ))}
        </div>
      </motion.div>

      {/* Reach + Engagement charts */}
      <motion.div {...wu(0.1)} className="grid lg:grid-cols-2 gap-5 mb-5">

        {/* Reach */}
        <div className="border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase font-medium">Writing activity</p>
            {platform === 'all' && (
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                {['linkedin', 'twitter', 'threads'].map(p => (
                  <span key={p} className="flex items-center gap-1">
                    <PlatformDot p={p} /> {p === 'twitter' ? 'X' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={reachData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(45 60% 45% / 0.06)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'hsl(37 14% 40%)' }}
                axisLine={false} tickLine={false}
                interval={range === '7D' ? 0 : range === '30D' ? 4 : 13}
              />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(37 14% 40%)' }} axisLine={false} tickLine={false} width={38} tickFormatter={fmt} />
              <Tooltip content={<ChartTip />} />
              {multiPlatforms.map(p => (
                <Area
                  key={p}
                  type="monotone"
                  dataKey={p}
                  stroke={platformColors[p]}
                  strokeWidth={1.5}
                  fill={platformColors[p]}
                  fillOpacity={platform === 'all' ? 0.04 : 0.07}
                  dot={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement rate */}
        <div className="border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase font-medium">Engagement Rate</p>
            {platform === 'all' && (
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                {['linkedin', 'twitter', 'threads'].map(p => (
                  <span key={p} className="flex items-center gap-1">
                    <PlatformDot p={p} /> {p === 'twitter' ? 'X' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={engData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(45 60% 45% / 0.06)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'hsl(37 14% 40%)' }}
                axisLine={false} tickLine={false}
                interval={range === '7D' ? 0 : range === '30D' ? 4 : 13}
              />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(37 14% 40%)' }} axisLine={false} tickLine={false} width={32} tickFormatter={v => `${v}%`} />
              <Tooltip content={<ChartTip suffix="%" />} />
              {multiPlatforms.map(p => (
                <Line
                  key={p}
                  type="monotone"
                  dataKey={p}
                  stroke={platformColors[p]}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Follower Growth */}
      <motion.div {...wu(0.13)} className="border border-border rounded-lg p-6 mb-5">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase font-medium">Follower Growth</p>
          {platform === 'all' && (
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              {['linkedin', 'twitter', 'threads'].map(p => (
                <span key={p} className="flex items-center gap-1">
                  <PlatformDot p={p} /> {p === 'twitter' ? 'X' : p.charAt(0).toUpperCase() + p.slice(1)}
                </span>
              ))}
            </div>
          )}
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={follData} barSize={platform === 'all' ? 4 : 8} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(45 60% 45% / 0.06)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'hsl(37 14% 40%)' }}
              axisLine={false} tickLine={false}
              interval={range === '7D' ? 0 : range === '30D' ? 4 : 13}
            />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(37 14% 40%)' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip content={<ChartTip />} />
            {multiPlatforms.map(p => (
              <Bar key={p} dataKey={p} fill={platformColors[p]} fillOpacity={platform === 'all' ? 0.55 : 0.65} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Posting Heatmap */}
      <motion.div {...wu(0.15)} className="border border-border rounded-lg p-6 mb-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase font-medium">Posting Heatmap</p>
            <p className="text-[10px] text-muted-foreground/40 mt-0.5">
              Predicted engagement by day and time
            </p>
          </div>
          <div className="text-[10px] text-muted-foreground/40 hidden sm:block">
            {platform === 'all' ? 'All platforms' : PLATFORMS[platform].label} · peak windows highlighted
          </div>
        </div>
        <div className="mt-4">
          <PostingHeatmap platform={platform} />
        </div>
      </motion.div>

      {/* Audience Insights */}
      <motion.div {...wu(0.17)} className="mb-5">
        <AudienceInsights />
      </motion.div>

      {/* Bottom row: Top Posts + Best Times */}
      <motion.div {...wu(0.16)} className="grid lg:grid-cols-3 gap-5">

        {/* Top posts */}
        <div className="lg:col-span-2 border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <p className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase font-medium">Top Posts</p>
            <p className="text-[10px] text-muted-foreground/40">Eng.</p>
          </div>
          <div className="divide-y divide-border">
            {filteredTopPosts.map((p, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/15 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[10px] text-muted-foreground/30 tabular-nums w-3 flex-shrink-0">{i + 1}</span>
                  <PlatformDot p={p.platform} />
                  <p className="text-[12px] text-foreground truncate">{p.title}</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  <span className="text-[11px] text-primary font-semibold tabular-nums w-10 text-right">{p.engagement}</span>
                  {p.change === 'up' && <TrendingUp className="w-3 h-3 text-primary" />}
                  {p.change === 'down' && <TrendingDown className="w-3 h-3 text-destructive" />}
                  {p.change === 'flat' && <Minus className="w-3 h-3 text-muted-foreground/30" />}
                </div>
              </div>
            ))}
            {filteredTopPosts.length === 0 && (
              <div className="px-5 py-10 text-center text-[12px] text-muted-foreground">No posts for this platform yet.</div>
            )}
          </div>
        </div>

        {/* Best posting times */}
        <div className="border border-border rounded-lg p-5">
          <p className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase font-medium mb-1">Best Times to Post</p>
          <p className="text-[10px] text-muted-foreground/40 mb-5">Avg. engagement by hour</p>
          <div className="space-y-2.5">
            {bestTimes.map((t) => {
              const val = platform === 'all'
                ? +((t.li + t.tw + t.th) / 3).toFixed(1)
                : platform === 'linkedin' ? t.li
                : platform === 'twitter' ? t.tw
                : t.th;
              const max = 5.5;
              const isTop = val >= 4.5;
              return (
                <div key={t.hour} className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground w-8 flex-shrink-0">{t.hour}</span>
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(val / max) * 100}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className={`h-full rounded-full ${isTop ? 'bg-primary' : 'bg-primary/30'}`}
                    />
                  </div>
                  <span className={`text-[10px] tabular-nums w-8 text-right ${isTop ? 'text-primary font-semibold' : 'text-muted-foreground/50'}`}>
                    {val}%
                  </span>
                </div>
              );
            })}
          </div>

        </div>
      </motion.div>

    </div>
  );
}