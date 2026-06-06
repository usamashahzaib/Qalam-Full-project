import React, { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { PlanGateInline } from '@/components/ui/PlanGate';
import { canAccess } from '@/lib/planGating';
import { Sparkles, Loader2, MessageSquare, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { invokeLLM } from '@/api/ai';
import { motion, AnimatePresence } from 'framer-motion';

const SAMPLE_COMMENTS = [
  "How do you actually measure thought leadership ROI?",
  "This resonates — we're struggling with the same consistency problem",
  "Would love a follow-up on how you handle platform algorithm changes",
  "The part about authenticity vs. reach is something I think about daily",
  "We tried this approach but got burned by posting too often. Any advice?",
  "What tools do you use for scheduling? We're still doing everything manually",
  "This is the best breakdown of B2B content strategy I've read this year",
  "Do you think LinkedIn is still worth it for SaaS companies under 50 employees?",
  "Totally agree — AI-generated content is everywhere and it's killing trust",
  "How long did it take before you started seeing compounding returns?",
  "We're seeing a huge drop in organic reach. Same for you?",
  "The personal story framework you use always gets incredible engagement",
];


const MOMENTUM_COLOR = { high: 'text-primary', medium: 'text-foreground/70', rising: 'text-emerald-400' };
const MOMENTUM_LABEL = { high: '↑ High', medium: '→ Steady', rising: '↗ Rising' };

export default function AudienceInsights() {
  const { plan } = useApp();
  const [status, setStatus] = useState('idle');
  const [data, setData] = useState(null);

  if (!canAccess(plan, 'audience_insights')) return <PlanGateInline feature="audience_insights" />;

  const runAnalysis = async () => {
    setStatus('loading');
    try {
      const result = await invokeLLM({
        prompt: `You are a social media analyst. Analyze the following example comments from a B2B thought leadership account and return structured JSON with:
1. sentiment breakdown (positive/neutral/negative percentages summing to 100)
2. top 4 customer pain points (topic, count, sentiment: positive/neutral/negative, sample quote)
3. top 5 trending discussion topics (topic, momentum: high/medium/rising, count)
4. a 2-sentence strategic summary

Comments to analyze:
${SAMPLE_COMMENTS.join('\n')}

Return ONLY valid JSON matching this schema exactly.`,
        response_json_schema: {
          type: 'object',
          properties: {
            sentiment: { type: 'object', properties: { positive: { type: 'number' }, neutral: { type: 'number' }, negative: { type: 'number' } } },
            pain_points: { type: 'array', items: { type: 'object', properties: { topic: { type: 'string' }, count: { type: 'number' }, sentiment: { type: 'string' }, sample: { type: 'string' } } } },
            trending_topics: { type: 'array', items: { type: 'object', properties: { topic: { type: 'string' }, momentum: { type: 'string' }, count: { type: 'number' } } } },
            summary: { type: 'string' },
          },
        },
      });
      if (result && result.sentiment) {
        setData(result);
        setStatus('done');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase font-medium">Audience Insights</p>
          </div>
          <p className="text-[10px] text-muted-foreground/40">Pattern analysis using example B2B comments · sentiment · pain points · trending topics</p>
        </div>
        {status === 'done' && data && (
          <button
            onClick={runAnalysis}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        )}
      </div>

      {/* Idle state */}
      {status === 'idle' && (
        <div className="px-6 py-10 flex flex-col items-center text-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-foreground mb-1">Sample audience analysis</p>
            <p className="text-[11px] text-muted-foreground/60 max-w-xs leading-relaxed">
              Analyzes a set of example B2B comments to demonstrate sentiment, pain points, and topic patterns. Requires a Groq API key.
            </p>
          </div>
          <button
            onClick={runAnalysis}
            className="flex items-center gap-2 px-5 py-2.5 text-[12px] font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> Run Analysis
          </button>
        </div>
      )}

      {/* Loading */}
      {status === 'loading' && (
        <div className="px-6 py-10 flex flex-col items-center gap-3">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <p className="text-[12px] text-muted-foreground">Analyzing {SAMPLE_COMMENTS.length} sample comments…</p>
          <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '90%' }}
              transition={{ duration: 2.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="px-6 py-10 flex flex-col items-center text-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive/60" />
          <p className="text-[12px] text-muted-foreground">Analysis failed. Check your Groq API key and try again.</p>
          <button
            onClick={runAnalysis}
            className="text-[11px] text-primary hover:underline underline-offset-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {status === 'done' && data && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">

            {/* Sentiment bar */}
            <div>
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-3">Overall Sentiment</p>
              <div className="flex rounded-full overflow-hidden h-2.5 gap-px">
                <div className="bg-emerald-500/70 rounded-l-full" style={{ width: `${data.sentiment.positive}%` }} />
                <div className="bg-muted-foreground/30" style={{ width: `${data.sentiment.neutral}%` }} />
                <div className="bg-destructive/50 rounded-r-full" style={{ width: `${data.sentiment.negative}%` }} />
              </div>
              <div className="flex items-center gap-4 mt-2">
                {[
                  { label: 'Positive', val: data.sentiment.positive, cls: 'text-emerald-400' },
                  { label: 'Neutral', val: data.sentiment.neutral, cls: 'text-muted-foreground/60' },
                  { label: 'Negative', val: data.sentiment.negative, cls: 'text-destructive/70' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-1.5 text-[10px]">
                    <span className={`font-semibold tabular-nums ${s.cls}`}>{s.val}%</span>
                    <span className="text-muted-foreground/40">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pain points + Trending side by side */}
            <div className="grid sm:grid-cols-2 gap-5">

              {/* Pain points */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <AlertCircle className="w-3 h-3 text-destructive/60" />
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Customer Pain Points</p>
                </div>
                <div className="space-y-2">
                  {data.pain_points.map((p, i) => (
                    <div key={i} className="px-3 py-2.5 rounded-lg bg-muted/20 border border-border/60 hover:border-border transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-medium text-foreground">{p.topic}</span>
                        <span className="text-[10px] text-muted-foreground/50 tabular-nums">{p.count} mentions</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/50 italic leading-relaxed">"{p.sample}"</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trending topics */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <TrendingUp className="w-3 h-3 text-primary" />
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Trending Topics</p>
                </div>
                <div className="space-y-2">
                  {data.trending_topics.map((t, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/20 border border-border/60 hover:border-border transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] text-muted-foreground/30 tabular-nums w-3">{i + 1}</span>
                        <span className="text-[12px] text-foreground truncate">{t.topic}</span>
                      </div>
                      <span className={`text-[10px] font-semibold flex-shrink-0 ml-2 ${MOMENTUM_COLOR[t.momentum] || 'text-muted-foreground'}`}>
                        {MOMENTUM_LABEL[t.momentum] || t.momentum}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI summary */}
            <div className="px-4 py-3.5 rounded-lg bg-primary/5 border border-primary/15">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-[10px] text-primary font-semibold uppercase tracking-wider">Strategic Summary</span>
              </div>
              <p className="text-[12px] text-foreground/80 leading-relaxed">{data.summary}</p>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
