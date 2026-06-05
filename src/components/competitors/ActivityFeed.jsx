import React, { useState } from 'react';
import { Zap, TrendingUp, Lightbulb, RefreshCw, Loader2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { invokeLLM } from '@/api/ai';
import { toast } from 'sonner';

const DEMO_FEED = [
  {
    id: 1,
    competitorName: 'Sarah Chen',
    competitorAvatar: 'SC',
    platform: 'linkedin',
    timeAgo: '2h ago',
    postTitle: 'Why quiet quitting is actually a leadership failure (not an employee problem)',
    engagement: '9.2%',
    reach: '22.1K',
    isHot: true,
    topics: ['Leadership', 'Remote work', 'Management'],
    gap: 'You haven\'t covered the leadership accountability angle in remote work yet',
  },
  {
    id: 2,
    competitorName: 'Marcus Webb',
    competitorAvatar: 'MW',
    platform: 'twitter',
    timeAgo: '4h ago',
    postTitle: 'Thread: The 3 pricing mistakes that killed my first SaaS (and how I fixed them)',
    engagement: '5.1%',
    reach: '31.4K',
    isHot: true,
    topics: ['Pricing', 'SaaS', 'Mistakes'],
    gap: 'Pricing strategy is a content gap — you\'ve written about growth but not monetization',
  },
  {
    id: 3,
    competitorName: 'Sarah Chen',
    competitorAvatar: 'SC',
    platform: 'linkedin',
    timeAgo: '1d ago',
    postTitle: 'I hired someone for "culture fit" — biggest mistake of my career',
    engagement: '6.8%',
    reach: '17.3K',
    isHot: false,
    topics: ['Hiring', 'Culture', 'Leadership'],
    gap: null,
  },
  {
    id: 4,
    competitorName: 'Marcus Webb',
    competitorAvatar: 'MW',
    platform: 'twitter',
    timeAgo: '1d ago',
    postTitle: 'Hot take: your onboarding is why new hires quit in month 3',
    engagement: '4.3%',
    reach: '19.8K',
    isHot: false,
    topics: ['Onboarding', 'Retention', 'HR'],
    gap: 'Employee onboarding content has high engagement for competitors but you haven\'t touched it',
  },
  {
    id: 5,
    competitorName: 'Sarah Chen',
    competitorAvatar: 'SC',
    platform: 'linkedin',
    timeAgo: '2d ago',
    postTitle: 'The meeting that changed how I lead my entire team',
    engagement: '5.5%',
    reach: '14.1K',
    isHot: false,
    topics: ['Meetings', 'Leadership', 'Teams'],
    gap: null,
  },
];

const CONTENT_GAPS = [
  { topic: 'Pricing strategy & monetization', competitorPosts: 3, avgEng: '4.8%', urgency: 'high' },
  { topic: 'Employee onboarding & retention', competitorPosts: 2, avgEng: '5.1%', urgency: 'high' },
  { topic: 'Remote leadership accountability', competitorPosts: 4, avgEng: '6.2%', urgency: 'medium' },
  { topic: 'Hiring for skills vs. culture', competitorPosts: 2, avgEng: '5.8%', urgency: 'medium' },
];

const PLATFORM_COLORS = { linkedin: 'bg-blue-900/40 text-blue-300', twitter: 'bg-zinc-800 text-zinc-400' };
const PLATFORM_LABELS = { linkedin: 'LI', twitter: 'X' };
const URGENCY_COLORS = { high: 'text-destructive/70 border-destructive/20 bg-destructive/5', medium: 'text-primary border-primary/20 bg-primary/5' };

function FeedItem({ item, onCapitalize }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-lg overflow-hidden transition-colors ${item.isHot ? 'border-primary/25 bg-primary/3' : 'border-border bg-card/40'}`}
    >
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground flex-shrink-0 mt-0.5">
              {item.competitorAvatar}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-medium text-foreground">{item.competitorName}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${PLATFORM_COLORS[item.platform]}`}>
                  {PLATFORM_LABELS[item.platform]}
                </span>
                {item.isHot && (
                  <span className="flex items-center gap-0.5 text-[9px] text-primary font-semibold">
                    <Zap className="w-2.5 h-2.5" /> Hot
                  </span>
                )}
              </div>
              <p className="text-[12px] text-foreground/85 leading-snug">{item.postTitle}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                <span className="text-muted-foreground/40 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{item.timeAgo}</span>
                <span className="text-muted-foreground/40">{item.reach} reach</span>
                <span className="text-primary font-semibold">{item.engagement} eng.</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {item.topics.map(t => (
                  <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground/50">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {item.gap && (
          <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-md bg-muted/30 border border-border/60">
            <Lightbulb className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground/60 leading-relaxed">{item.gap}</p>
            </div>
            <button
              onClick={() => onCapitalize(item)}
              className="flex-shrink-0 text-[10px] text-primary font-medium hover:underline underline-offset-4 whitespace-nowrap"
            >
              Write this →
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ActivityFeed({ competitors }) {
  const [feed, setFeed] = useState(DEMO_FEED);
  const [gaps, setGaps] = useState(CONTENT_GAPS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'gaps'
  const [isGeneratingGaps, setIsGeneratingGaps] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(r => setTimeout(r, 1200));
    toast.success('Feed refreshed', { description: 'Checked 2 competitors for new content.' });
    setIsRefreshing(false);
  };

  const handleCapitalize = (item) => {
    toast.success('Opening Writer', { description: `Topic: "${item.postTitle.slice(0, 50)}..."` });
    setTimeout(() => window.location.href = '/writer', 800);
  };

  const handleGenerateGaps = async () => {
    setIsGeneratingGaps(true);
    const topPosts = feed.slice(0, 4).map(f => f.postTitle).join('\n');
    try {
      const res = await invokeLLM({
        prompt: `Based on these high-performing competitor posts, identify 4 content gaps — topics the competitors are winning on that this creator hasn't addressed yet.

Competitor posts:
${topPosts}

Return JSON: { gaps: [ { topic: string, competitorPosts: number, avgEng: string, urgency: "high"|"medium" } ] }`,
        response_json_schema: {
          type: 'object',
          properties: {
            gaps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  topic: { type: 'string' },
                  competitorPosts: { type: 'number' },
                  avgEng: { type: 'string' },
                  urgency: { type: 'string' },
                },
              },
            },
          },
        },
      });
      if (res?.gaps?.length) setGaps(res.gaps);
    } catch {
      toast.error('Analysis failed', { description: 'Could not identify content gaps. Try again.' });
    } finally {
      setIsGeneratingGaps(false);
    }
  };

  const hotCount = feed.filter(f => f.isHot).length;

  return (
    <div className="mt-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase font-medium mb-1">Live Activity</p>
          <p className="text-[11px] text-muted-foreground/50">
            {hotCount > 0 && <span className="text-primary font-semibold">{hotCount} hot posts</span>} in the last 24h
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-muted-foreground border border-border rounded-md hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Checking…' : 'Refresh'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 mb-5 border-b border-border">
        {[
          { id: 'feed', label: `Activity feed (${feed.length})` },
          { id: 'gaps', label: `Content gaps (${gaps.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-[12px] transition-colors -mb-px border-b-2 ${
              activeTab === tab.id
                ? 'text-foreground border-primary font-medium'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {activeTab === 'feed' && (
        <div className="space-y-3">
          {feed.map(item => (
            <FeedItem key={item.id} item={item} onCapitalize={handleCapitalize} />
          ))}
        </div>
      )}

      {/* Content gaps */}
      {activeTab === 'gaps' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground/60">Topics your competitors are winning — that you haven't covered yet.</p>
            <button
              onClick={handleGenerateGaps}
              disabled={isGeneratingGaps}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-primary border border-primary/25 rounded-md hover:bg-primary/8 transition-colors disabled:opacity-40"
            >
              {isGeneratingGaps ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing…</> : <><Zap className="w-3 h-3" /> AI analysis</>}
            </button>
          </div>
          <div className="space-y-2">
            {gaps.map((gap, i) => (
              <div key={i} className={`flex items-center justify-between px-4 py-3.5 rounded-lg border ${URGENCY_COLORS[gap.urgency] || 'border-border bg-card/40'}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[12px] font-medium text-foreground">{gap.topic}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide ${gap.urgency === 'high' ? 'bg-destructive/10 text-destructive/70' : 'bg-primary/10 text-primary'}`}>
                      {gap.urgency}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground/50">
                    <span>{gap.competitorPosts} competitor posts</span>
                    <span className="text-primary font-medium">{gap.avgEng} avg. eng.</span>
                  </div>
                </div>
                <button
                  onClick={() => { toast.success(`Opening Writer for: ${gap.topic}`); setTimeout(() => window.location.href = '/writer', 700); }}
                  className="flex items-center gap-1.5 ml-4 px-3 py-1.5 text-[11px] font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex-shrink-0"
                >
                  <TrendingUp className="w-3 h-3" /> Capitalize
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}