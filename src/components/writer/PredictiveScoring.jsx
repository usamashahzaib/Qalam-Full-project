import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/lib/AppContext';
import { PlanGateInline } from '@/components/ui/PlanGate';
import { canAccess } from '@/lib/planGating';
import { Zap, AlertTriangle, Lightbulb, RefreshCw, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { invokeLLM } from '@/api/ai';
import { toast } from 'sonner';

// Industry baseline benchmarks by platform
const INDUSTRY_BENCHMARKS = {
  linkedin: { avgEngagement: 4.7, topEngagement: 8.2, avgReach: 9400 },
  twitter:  { avgEngagement: 3.1, topEngagement: 6.4, avgReach: 18200 },
  threads:  { avgEngagement: 2.8, topEngagement: 5.1, avgReach: 6100 },
};

const HIGH_ENG_PATTERNS = [
  'personal story or vulnerability',
  'contrarian or provocative take',
  'numbered list or framework',
  'specific data point or statistic',
  'direct question to reader',
  'clear call-to-action',
  'short punchy opening line',
];

// Debounce hook
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Animated score ring
function ScoreRing({ score, size = 72 }) {
  const radius = (size - 10) / 2;
  const circ = 2 * Math.PI * radius;
  const fill = score > 0 ? (score / 100) * circ : 0;
  const color = score >= 80 ? '#E5AD00' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  const label = score >= 80 ? 'Exceptional' : score >= 60 ? 'Strong' : score >= 40 ? 'Average' : 'Needs work';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(160 30% 12%)" strokeWidth="5" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[18px] font-bold tabular-nums leading-none" style={{ color }}>{score > 0 ? score : '—'}</span>
        {score > 0 && <span className="text-[9px] text-muted-foreground/60 mt-0.5">{label}</span>}
      </div>
    </div>
  );
}

function MissingElement({ item, present }) {
  return (
    <div className={`flex items-center gap-2 text-[11px] ${present ? 'text-foreground/50 line-through' : 'text-foreground/80'}`}>
      <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center border ${present ? 'border-primary/40 bg-primary/10' : 'border-muted-foreground/20 bg-transparent'}`}>
        {present && <Check className="w-2 h-2 text-primary" />}
      </div>
      {item}
    </div>
  );
}

export default function PredictiveScoring({ content, platform }) {
  const { plan } = useApp();
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hookExpanded, setHookExpanded] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const debouncedContent = useDebounce(content, 1800);
  const lastAnalyzed = useRef('');

  const bench = INDUSTRY_BENCHMARKS[platform] || INDUSTRY_BENCHMARKS.linkedin;

  const runAnalysis = async (text) => {
    if (!text || text.length < 80) return;
    setIsAnalyzing(true);
    lastAnalyzed.current = text;

    try {
      const res = await invokeLLM({
        prompt: `You are a social media engagement analyst. Analyze this ${platform} post draft against industry baseline benchmarks (avg: ${bench.avgEngagement}% engagement, top posts: ${bench.topEngagement}%).

Post:
"""
${text.slice(0, 1500)}
"""

Score 0-100 for virality potential. Check which of these high-engagement patterns are present: ${HIGH_ENG_PATTERNS.join(', ')}.

If the hook (first line) is weak, suggest 2 alternative hooks.
Identify 1-2 specific, actionable improvements.

Return JSON only:
{
  "virality_score": number,
  "predicted_engagement": string,
  "predicted_reach": string,
  "hook_strength": number,
  "patterns_present": string[],
  "patterns_missing": string[],
  "hook_alternatives": string[],
  "improvements": string[],
  "verdict": "one sentence summary of the post's strength"
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            virality_score: { type: 'number' },
            predicted_engagement: { type: 'string' },
            predicted_reach: { type: 'string' },
            hook_strength: { type: 'number' },
            patterns_present: { type: 'array', items: { type: 'string' } },
            patterns_missing: { type: 'array', items: { type: 'string' } },
            hook_alternatives: { type: 'array', items: { type: 'string' } },
            improvements: { type: 'array', items: { type: 'string' } },
            verdict: { type: 'string' },
          },
        },
      });
      setAnalysis(res);
    } catch {
      toast.error('Scoring failed', { description: 'Could not analyze your post. Try again.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!autoMode) return;
    if (debouncedContent.length < 80) { setAnalysis(null); return; }
    if (Math.abs(debouncedContent.length - lastAnalyzed.current.length) < 30 && lastAnalyzed.current.length > 0) return;
    runAnalysis(debouncedContent);
  }, [debouncedContent, autoMode]);

  if (!canAccess(plan, 'signal_scoring')) return <PlanGateInline feature="signal_scoring" />;

  const score = analysis?.virality_score ?? 0;
  const showHookAlts = analysis?.hook_strength < 65 && analysis?.hook_alternatives?.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold">Post Signal</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoMode(a => !a)}
              className={`text-[9px] px-1.5 py-0.5 rounded font-medium transition-colors ${autoMode ? 'bg-primary/15 text-primary' : 'bg-muted/60 text-muted-foreground/50'}`}
              title={autoMode ? 'Auto-analysis on' : 'Auto-analysis off'}
            >
              {autoMode ? 'Auto' : 'Manual'}
            </button>
            <button
              onClick={() => runAnalysis(content)}
              disabled={isAnalyzing || content.length < 80}
              className="text-muted-foreground/40 hover:text-muted-foreground transition-colors disabled:opacity-30 p-0.5"
              title="Re-analyze"
            >
              <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground/40 mt-0.5">vs. industry baseline · {bench.avgEngagement}% avg.</p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Empty / loading state */}
        {content.length < 80 && !isAnalyzing && (
          <div className="flex flex-col items-center pt-6 text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-muted-foreground/20" />
            </div>
            <p className="text-[11px] text-muted-foreground/40 leading-relaxed">Start writing — signal activates as you go.</p>
          </div>
        )}

        {isAnalyzing && (
          <div className="flex flex-col items-center pt-6 gap-3">
            <ScoreRing score={0} />
            <p className="text-[11px] text-muted-foreground/50">Analyzing post…</p>
            <div className="w-32 h-0.5 bg-muted/30 rounded-full overflow-hidden">
              <motion.div className="h-full bg-primary/50 rounded-full" initial={{ width: '0%' }} animate={{ width: '85%' }} transition={{ duration: 1.5 }} />
            </div>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {analysis && !isAnalyzing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

              {/* Score + predictions */}
              <div className="flex items-center gap-4">
                <ScoreRing score={score} />
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground/50">Pred. engagement</span>
                    <span className="font-semibold text-primary tabular-nums">{analysis.predicted_engagement || '—'}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground/50">Est. reach</span>
                    <span className="font-semibold text-foreground/70 tabular-nums">{analysis.predicted_reach || '—'}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground/50">Hook strength</span>
                    <span className={`font-semibold tabular-nums ${(analysis.hook_strength || 0) >= 70 ? 'text-primary' : 'text-orange-400'}`}>
                      {analysis.hook_strength || '—'}/100
                    </span>
                  </div>
                </div>
              </div>

              {/* Verdict */}
              {analysis.verdict && (
                <div className="px-3 py-2.5 rounded-lg bg-muted/25 border border-border/60">
                  <p className="text-[11px] text-foreground/70 leading-relaxed italic">"{analysis.verdict}"</p>
                </div>
              )}

              {/* Hook alternatives (if weak) */}
              {showHookAlts && (
                <div className="border border-orange-500/20 bg-orange-500/5 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setHookExpanded(e => !e)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3 text-orange-400 flex-shrink-0" />
                      <span className="text-[11px] font-medium text-orange-300">Hook needs work — try these instead</span>
                    </div>
                    {hookExpanded ? <ChevronUp className="w-3 h-3 text-orange-400/60" /> : <ChevronDown className="w-3 h-3 text-orange-400/60" />}
                  </button>
                  <AnimatePresence>
                    {hookExpanded && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-3 pb-3 space-y-2">
                          {analysis.hook_alternatives.map((alt, i) => (
                            <div key={i} className="px-2.5 py-2 bg-muted/30 rounded text-[11px] text-foreground/80 leading-snug border border-border/40">
                              "{alt}"
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Engagement elements checklist */}
              <div>
                <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider mb-2.5">Engagement elements</p>
                <div className="space-y-1.5">
                  {HIGH_ENG_PATTERNS.map(pattern => {
                    const present = analysis.patterns_present?.some(p =>
                      p.toLowerCase().includes(pattern.split(' ')[0].toLowerCase()) ||
                      pattern.toLowerCase().includes(p.toLowerCase().split(' ')[0])
                    );
                    return <MissingElement key={pattern} item={pattern} present={present} />;
                  })}
                </div>
              </div>

              {/* Actionable improvements */}
              {analysis.improvements?.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider mb-2.5">Improvements</p>
                  <div className="space-y-2">
                    {analysis.improvements.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/15">
                        <Lightbulb className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] text-foreground/75 leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}



            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}