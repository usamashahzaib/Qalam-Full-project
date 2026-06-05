import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Sparkles, Loader2 } from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { toast } from 'sonner';
import { invokeLLM } from '@/api/ai';
import { PlanGatePage } from '@/components/ui/PlanGate';
import { canAccess } from '@/lib/planGating';

const wu = (d = 0) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: d, duration: 0.3 },
});

export default function VoiceFingerprint() {
  const { posts, voiceSettings, setVoiceSettings, plan } = useApp();
  const { consistencyScore, toneProfile, bannedPhrases } = voiceSettings;
  const [newPhrase, setNewPhrase] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [sampleBlock, setSampleBlock] = useState('');
  const [generating, setGenerating] = useState(false);

  const published = useMemo(
    () => posts.filter((p) => p.status === 'published' && (p.content || '').trim().length > 40),
    [posts]
  );

  const contentPillars = useMemo(() => {
    const map = {};
    for (const p of posts) {
      const cat = p.category || 'General';
      map[cat] = (map[cat] || 0) + 1;
    }
    const rows = Object.entries(map).map(([name, n]) => ({ name, posts: n }));
    return rows.sort((a, b) => b.posts - a.posts);
  }, [posts]);

  const pillarTotal = contentPillars.reduce((a, p) => a + p.posts, 0) || 1;

  const writingSamples = useMemo(() => {
    return published.slice(0, 5).map((p) => ({
      text: (p.content || '').slice(0, 420),
      source: `${p.date || ''} · Published`,
    }));
  }, [published]);

  const handleGenerateProfile = useCallback(async () => {
    const fromPosts = published.map((p) => p.content).join('\n\n---\n\n');
    const samples = (sampleBlock.trim() || fromPosts).trim();
    if (samples.length < 120) {
      toast.error('Add writing samples (120+ chars), or publish posts with content in your library.');
      return;
    }
    setGenerating(true);
    try {
      const res = await invokeLLM({
        prompt: `You are a linguist. Analyze these writing samples and return ONLY valid JSON with:
{
  "consistency_score": <integer 0-100 how consistent the voice is across samples>,
  "scores": {
    "Directness": <0-100>,
    "Warmth": <0-100>,
    "Authority": <0-100>,
    "Storytelling": <0-100>,
    "Data-driven": <0-100>,
    "Vulnerability": <0-100>
  },
  "summary": "<2 sentences describing the voice>",
  "avoid": ["<phrases or patterns to avoid>", "..."],
  "signature_moves": ["<2-4 stylistic habits>", "..."]
}
Samples:
"""${samples.slice(0, 12000)}"""`,
        response_json_schema: {
          type: 'object',
          properties: {
            consistency_score: { type: 'integer' },
            scores: {
              type: 'object',
              properties: {
                Directness: { type: 'integer' },
                Warmth: { type: 'integer' },
                Authority: { type: 'integer' },
                Storytelling: { type: 'integer' },
                'Data-driven': { type: 'integer' },
                Vulnerability: { type: 'integer' },
              },
            },
            summary: { type: 'string' },
            avoid: { type: 'array', items: { type: 'string' } },
            signature_moves: { type: 'array', items: { type: 'string' } },
          },
        },
      });

      const scores = res?.scores || {};
      setVoiceSettings((v) => ({
        ...v,
        consistencyScore: typeof res?.consistency_score === 'number' ? res.consistency_score : v.consistencyScore,
        toneProfile: v.toneProfile.map((t) => ({
          ...t,
          value:
            typeof scores[t.trait] === 'number'
              ? Math.min(100, Math.max(0, scores[t.trait]))
              : t.value,
        })),
        aiVoiceSummary: res?.summary || v.aiVoiceSummary,
        bannedPhrases: Array.from(
          new Set([...(v.bannedPhrases || []), ...(res?.avoid || []).map((x) => String(x).toLowerCase())])
        ).filter(Boolean),
      }));
      toast.success('Voice profile generated', {
        description: 'Saved to your workspace (local + cloud when configured).',
      });
    } catch (e) {
      toast.error(e?.message || 'Could not generate profile. Check VITE_GROQ_API_KEY.');
    }
    setGenerating(false);
  }, [published, sampleBlock, setVoiceSettings]);

  if (!canAccess(plan, 'voice_fingerprint')) return <PlanGatePage feature="voice_fingerprint" />;

  const addPhrase = () => {
    const phrase = newPhrase.trim().toLowerCase();
    if (!phrase) return;
    if (bannedPhrases.includes(phrase)) {
      toast.error('Already on the list.');
      return;
    }
    setVoiceSettings((v) => ({ ...v, bannedPhrases: [...v.bannedPhrases, phrase] }));
    setNewPhrase('');
    setShowInput(false);
    toast.success('Banned phrase added');
  };

  const removePhrase = (phrase) =>
    setVoiceSettings((v) => ({ ...v, bannedPhrases: v.bannedPhrases.filter((p) => p !== phrase) }));

  const updateTone = (trait, value) =>
    setVoiceSettings((v) => ({
      ...v,
      toneProfile: v.toneProfile.map((t) =>
        t.trait === trait ? { ...t, value: parseInt(value, 10) } : t
      ),
    }));

  return (
    <div className="min-h-full px-6 py-10 sm:px-10 lg:px-14 lg:py-14 max-w-[780px] mx-auto">
      <motion.div {...wu(0)} className="mb-14">
        <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase font-medium mb-4">Voice DNA</p>
        <h1 className="font-serif text-[32px] font-medium tracking-tight leading-none mb-3">Voice Fingerprint</h1>
        <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[480px]">
          Your writing identity, decoded. Generate a profile from samples (Groq), then fine-tune sliders — settings flow
          into the Writer.
        </p>
      </motion.div>

      {/* Voice profile generation */}
      <motion.div {...wu(0.04)} className="border border-border rounded-lg p-6 mb-10 bg-card/50">
        <p className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase font-medium mb-3">
          Voice profile
        </p>
        <p className="text-[12px] text-muted-foreground mb-4">
          Paste 1–3 samples below, or leave empty to use published posts from your library. Requires{' '}
          <code className="text-[11px] bg-muted px-1 rounded">VITE_GROQ_API_KEY</code>.
        </p>
        <textarea
          value={sampleBlock}
          onChange={(e) => setSampleBlock(e.target.value)}
          placeholder="Optional: paste LinkedIn posts or paragraphs that sound like you…"
          className="w-full min-h-[120px] rounded-md border border-border bg-muted/60 px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/40 mb-4"
        />
        <button
          type="button"
          disabled={generating}
          onClick={handleGenerateProfile}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'Analyzing…' : 'Generate profile from samples'}
        </button>
        {voiceSettings.aiVoiceSummary && (
          <p className="text-[13px] text-foreground/85 mt-4 leading-relaxed border-l-2 border-primary/30 pl-4">
            {voiceSettings.aiVoiceSummary}
          </p>
        )}
      </motion.div>

      <motion.div {...wu(0.06)} className="border border-border rounded-lg p-6 mb-12">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase font-medium mb-2">
              Voice consistency
            </p>
            <p className="text-[12px] text-muted-foreground">
              Based on {published.length} published post{published.length !== 1 ? 's' : ''} with content
            </p>
          </div>
          <div className="flex items-baseline gap-1 text-right">
            <span className="text-[42px] font-extralight tracking-tighter leading-none">{consistencyScore}</span>
            <span className="text-[13px] text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className="h-[1.5px] bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${consistencyScore}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="h-full bg-primary/60 rounded-full"
          />
        </div>
      </motion.div>

      <motion.div {...wu(0.1)} className="h-px bg-border mb-12" />

      <motion.div {...wu(0.13)} className="mb-12">
        <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase font-medium mb-7">Tone profile</p>
        <div className="space-y-6">
          {toneProfile.map((t, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-[12px] mb-2.5">
                <span className="text-muted-foreground">{t.trait}</span>
                <span className="font-medium tabular-nums text-foreground w-8 text-right">{t.value}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={t.value}
                onChange={(e) => updateTone(t.trait, e.target.value)}
                className="w-full h-[1.5px] accent-primary cursor-pointer bg-muted rounded-full appearance-none"
              />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground/50 mt-5">Adjust sliders to set your default tone profile.</p>
      </motion.div>

      <motion.div {...wu(0.16)} className="h-px bg-border mb-12" />

      <motion.div {...wu(0.18)} className="mb-12">
        <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase font-medium mb-7">
          Content pillars
        </p>
        {contentPillars.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Create posts with categories to see pillar distribution.</p>
        ) : (
          <div className="space-y-5">
            {contentPillars.map((p, i) => {
              const pct = Math.round((p.posts / pillarTotal) * 100);
              return (
                <div key={p.name}>
                  <div className="flex items-center justify-between text-[12px] mb-2">
                    <span className="text-muted-foreground">{p.name}</span>
                    <span className="tabular-nums text-foreground/70">{p.posts} posts</span>
                  </div>
                  <div className="h-[1.5px] bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.9, delay: 0.2 + i * 0.07 }}
                      className="h-full bg-primary/45 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      <motion.div {...wu(0.2)} className="h-px bg-border mb-12" />

      <motion.div {...wu(0.22)} className="mb-12">
        <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase font-medium mb-7">
          Style samples
        </p>
        {writingSamples.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            No published post bodies yet — publish from Writer or paste samples above for analysis.
          </p>
        ) : (
          <div className="space-y-5">
            {writingSamples.map((s, i) => (
              <div key={i} className="pl-5 border-l border-primary/25">
                <p className="text-[14px] text-foreground/75 leading-[1.75] italic">&quot;{s.text}&quot;</p>
                <p className="text-[11px] text-muted-foreground/50 mt-2">{s.source}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div {...wu(0.24)} className="h-px bg-border mb-12" />

      <motion.div {...wu(0.26)}>
        <div className="flex items-center justify-between mb-6">
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase font-medium">Banned phrases</p>
          <button
            type="button"
            onClick={() => setShowInput((v) => !v)}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3 h-3" />
            Add phrase
          </button>
        </div>

        {showInput && (
          <div className="flex gap-2 mb-5">
            <input
              value={newPhrase}
              onChange={(e) => setNewPhrase(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPhrase()}
              placeholder="e.g. synergy"
              autoFocus
              className="flex-1 bg-muted border-0 rounded-md px-3 py-2 text-[13px] outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/30"
            />
            <button
              type="button"
              onClick={addPhrase}
              className="px-4 py-2 text-[12px] font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Add
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {bannedPhrases.map((phrase, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-[11px] text-muted-foreground hover:border-border/80 transition-colors group"
            >
              {phrase}
              <button
                type="button"
                onClick={() => removePhrase(phrase)}
                className="text-muted-foreground/30 hover:text-destructive transition-colors ml-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
