import React, { useState } from 'react';
import { Sparkles, Copy, Check, ArrowRight, AlertCircle, RefreshCw, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { invokeLLM } from '@/api/ai';
import { toast } from 'sonner';

const XIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-7.481zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
  </svg>
);
const ThreadsIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.851 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-.505-1.808-1.403-3.232-2.673-4.233-1.286-.981-2.975-1.482-5.010-1.498-2.927.018-5.195.976-6.74 2.848-1.548 1.875-2.333 4.476-2.356 7.733.025 3.254.81 5.852 2.356 7.727 1.544 1.872 3.815 2.831 6.743 2.848 1.908-.018 3.553-.516 4.868-1.482.956-.699 1.63-1.622 2.02-2.774H12.12v-2.014h9.714c.114.578.168 1.16.168 1.733 0 2.605-.832 4.695-2.478 6.218C17.882 23.28 15.315 24 12.186 24z"/>
  </svg>
);
const NewsletterIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const TONE_OPTIONS = [
  { id: 'match', label: 'Match original', desc: 'Keep the same tone & voice' },
  { id: 'punchy', label: 'Punchier', desc: 'Shorter sentences, more energy' },
  { id: 'storytelling', label: 'Storytelling', desc: 'Narrative-first, emotional pull' },
  { id: 'professional', label: 'Professional', desc: 'Polished, authoritative' },
  { id: 'casual', label: 'Casual', desc: 'Like texting a smart friend' },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/40">
      {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ThreadDisplay({ tweets }) {
  if (!tweets?.length) return null;
  return (
    <div className="space-y-0">
      {tweets.map((t, i) => (
        <div key={i} className="flex gap-2">
          <div className="flex flex-col items-center">
            <div className="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center text-[9px] text-muted-foreground font-medium flex-shrink-0">{i + 1}</div>
            {i < tweets.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
          </div>
          <div className="flex-1 pb-3">
            <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">{t}</p>
            <div className="flex items-center justify-between mt-1">
              <span className={`text-[10px] tabular-nums ${t.length > 280 ? 'text-destructive font-medium' : 'text-muted-foreground/40'}`}>
                {t.length}/280
              </span>
              <CopyButton text={t} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CharBar({ count, max, label }) {
  const pct = Math.min(100, (count / max) * 100);
  const over = count > max;
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1 bg-muted/40 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${over ? 'bg-destructive' : 'bg-primary/50'}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] tabular-nums flex-shrink-0 ${over ? 'text-destructive font-medium' : 'text-muted-foreground/40'}`}>
        {count}/{max} {label}
      </span>
    </div>
  );
}

export default function RepurposePanel({ sourceContent, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [tone, setTone] = useState('match');
  const [toneOpen, setToneOpen] = useState(false);
  const [results, setResults] = useState(null); // { x_thread, threads_post, newsletter }
  const [regenTarget, setRegenTarget] = useState(null); // 'x_thread' | 'threads_post' | 'newsletter'

  const hasContent = sourceContent?.trim().length > 50;
  const activeTone = TONE_OPTIONS.find(t => t.id === tone);

  const buildPrompt = (target) => {
    const toneInstr = tone === 'match' ? 'Match the tone and voice of the original exactly.'
      : tone === 'punchy' ? 'Use a punchier, higher-energy tone. Shorter sentences. More impact.'
      : tone === 'storytelling' ? 'Reframe everything with a narrative-first, emotional storytelling approach.'
      : tone === 'professional' ? 'Use a polished, authoritative, executive tone.'
      : 'Use a casual, conversational tone — like texting a smart friend.';

    if (target === 'x_thread') return `Convert this LinkedIn post into an X/Twitter thread of 4–7 tweets (each under 280 chars). ${toneInstr} Start with the sharpest hook. End with a CTA. Return JSON: {"x_thread": ["tweet1","tweet2",...]}
LinkedIn: """${sourceContent}"""`;

    if (target === 'threads_post') return `Convert this LinkedIn post into a single Threads post (under 500 chars). ${toneInstr} Raw, punchy, no hashtags. Return JSON: {"threads_post": "text here"}
LinkedIn: """${sourceContent}"""`;

    if (target === 'newsletter') return `Convert this LinkedIn post into a newsletter snippet (150–250 words). ${toneInstr} Use: a compelling subject line, an opening hook, 2–3 punchy paragraphs, and a 1-line CTA. Return JSON: {"newsletter": {"subject": "...", "body": "..."}}
LinkedIn: """${sourceContent}"""`;

    // all
    return `You are a master content repurposer. Convert this LinkedIn post into 3 formats. ${toneInstr}

1. X/Twitter thread: 4–7 tweets (each under 280 chars). Hook first, CTA last.
2. Threads post: under 500 chars, raw, conversational, no hashtags.
3. Newsletter snippet: subject line + 150–250 word body with hook, 2–3 paragraphs, 1-line CTA.

LinkedIn post: """${sourceContent}"""

Return ONLY valid JSON:
{"x_thread":["t1","t2"],"threads_post":"...","newsletter":{"subject":"...","body":"..."}}`;
  };

  const getSchema = (target) => {
    if (target === 'x_thread') return { type: 'object', properties: { x_thread: { type: 'array', items: { type: 'string' } } } };
    if (target === 'threads_post') return { type: 'object', properties: { threads_post: { type: 'string' } } };
    if (target === 'newsletter') return { type: 'object', properties: { newsletter: { type: 'object', properties: { subject: { type: 'string' }, body: { type: 'string' } } } } };
    return {
      type: 'object',
      properties: {
        x_thread: { type: 'array', items: { type: 'string' } },
        threads_post: { type: 'string' },
        newsletter: { type: 'object', properties: { subject: { type: 'string' }, body: { type: 'string' } } },
      },
      required: ['x_thread', 'threads_post', 'newsletter'],
    };
  };

  const handleGenerate = async (target = null) => {
    if (!hasContent) { toast.error('Write at least 50 characters first.'); return; }
    setIsGenerating(true);
    setRegenTarget(target);

    try {
      const res = await invokeLLM({
        prompt: buildPrompt(target),
        response_json_schema: getSchema(target),
      });
      if (target) {
        setResults(prev => ({ ...prev, [target]: res?.[target] }));
      } else {
        setResults(res);
      }
    } catch {
      toast.error('Generation failed', { description: 'Could not repurpose your content. Try again.' });
    } finally {
      setIsGenerating(false);
      setRegenTarget(null);
    }
  };

  const isRegening = (key) => isGenerating && regenTarget === key;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold">Repurpose</span>
          </div>
          <button onClick={onClose} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">✕</button>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">LinkedIn → X thread · Threads · Newsletter</p>

        {/* Tone selector */}
        <div className="relative mt-3">
          <button
            onClick={() => setToneOpen(o => !o)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 bg-muted/40 border border-border/60 rounded-md text-[11px] hover:bg-muted/60 transition-colors"
          >
            <span className="text-muted-foreground/60">Tone: <span className="text-foreground font-medium">{activeTone.label}</span></span>
            <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${toneOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {toneOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full mt-1 left-0 right-0 z-20 bg-card border border-border rounded-lg shadow-xl overflow-hidden"
              >
                {TONE_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setTone(opt.id); setToneOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 hover:bg-muted/40 transition-colors text-left ${opt.id === tone ? 'bg-primary/8' : ''}`}
                  >
                    <div>
                      <p className={`text-[11px] font-medium ${opt.id === tone ? 'text-primary' : 'text-foreground'}`}>{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground/50">{opt.desc}</p>
                    </div>
                    {opt.id === tone && <Check className="w-3 h-3 text-primary flex-shrink-0" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Source preview */}
        {hasContent ? (
          <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground/50 mb-1">LinkedIn source</p>
            <p className="text-[11px] text-foreground/70 leading-relaxed line-clamp-3">{sourceContent}</p>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/10 px-3 py-2.5">
            <AlertCircle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground/50">Write a LinkedIn post first (50+ chars), then repurpose it here.</p>
          </div>
        )}

        {/* Generate all button */}
        <button
          onClick={() => handleGenerate(null)}
          disabled={!hasContent || isGenerating}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isGenerating && !regenTarget ? (
            <><div className="w-3 h-3 border border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Repurposing all…</>
          ) : (
            <><Sparkles className="w-3 h-3" />{results ? 'Regenerate all' : 'Generate all versions'}<ArrowRight className="w-3 h-3" /></>
          )}
        </button>

        {/* Results */}
        <AnimatePresence>
          {results && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

              {/* X Thread */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
                  <div className="flex items-center gap-1.5">
                    <XIcon />
                    <span className="text-[10px] font-semibold">X Thread</span>
                    {results.x_thread && <span className="text-[9px] text-muted-foreground/50">{results.x_thread.length} tweets</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleGenerate('x_thread')} disabled={isGenerating} className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1 rounded" title="Regenerate">
                      <RefreshCw className={`w-3 h-3 ${isRegening('x_thread') ? 'animate-spin' : ''}`} />
                    </button>
                    {results.x_thread && <CopyButton text={results.x_thread.join('\n\n')} />}
                  </div>
                </div>
                <div className="p-3">
                  {isRegening('x_thread')
                    ? <div className="py-4 flex justify-center"><div className="w-4 h-4 border border-muted-foreground/20 border-t-primary rounded-full animate-spin" /></div>
                    : <ThreadDisplay tweets={results.x_thread} />
                  }
                </div>
              </div>

              {/* Threads post */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
                  <div className="flex items-center gap-1.5">
                    <ThreadsIcon />
                    <span className="text-[10px] font-semibold">Threads</span>
                    {results.threads_post && <span className="text-[9px] text-muted-foreground/50">{results.threads_post.length}/500 chars</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleGenerate('threads_post')} disabled={isGenerating} className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1 rounded" title="Regenerate">
                      <RefreshCw className={`w-3 h-3 ${isRegening('threads_post') ? 'animate-spin' : ''}`} />
                    </button>
                    {results.threads_post && <CopyButton text={results.threads_post} />}
                  </div>
                </div>
                <div className="p-3">
                  {isRegening('threads_post')
                    ? <div className="py-4 flex justify-center"><div className="w-4 h-4 border border-muted-foreground/20 border-t-primary rounded-full animate-spin" /></div>
                    : <>
                        <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">{results.threads_post}</p>
                        {results.threads_post && <CharBar count={results.threads_post.length} max={500} label="chars" />}
                      </>
                  }
                </div>
              </div>

              {/* Newsletter snippet */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
                  <div className="flex items-center gap-1.5">
                    <NewsletterIcon />
                    <span className="text-[10px] font-semibold">Newsletter</span>
                    {results.newsletter?.body && <span className="text-[9px] text-muted-foreground/50">{results.newsletter.body.split(/\s+/).length} words</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleGenerate('newsletter')} disabled={isGenerating} className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1 rounded" title="Regenerate">
                      <RefreshCw className={`w-3 h-3 ${isRegening('newsletter') ? 'animate-spin' : ''}`} />
                    </button>
                    {results.newsletter && <CopyButton text={`Subject: ${results.newsletter.subject}\n\n${results.newsletter.body}`} />}
                  </div>
                </div>
                <div className="p-3">
                  {isRegening('newsletter')
                    ? <div className="py-4 flex justify-center"><div className="w-4 h-4 border border-muted-foreground/20 border-t-primary rounded-full animate-spin" /></div>
                    : results.newsletter && (
                        <div className="space-y-2.5">
                          <div className="px-2.5 py-2 bg-muted/30 rounded border border-border/60">
                            <p className="text-[9px] text-muted-foreground/40 uppercase tracking-wider mb-0.5">Subject line</p>
                            <p className="text-[11px] font-medium text-foreground">{results.newsletter.subject}</p>
                          </div>
                          <p className="text-[11px] text-foreground/80 leading-relaxed whitespace-pre-wrap">{results.newsletter.body}</p>
                          {results.newsletter.body && <CharBar count={results.newsletter.body.split(/\s+/).filter(Boolean).length} max={250} label="words" />}
                        </div>
                      )
                  }
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}