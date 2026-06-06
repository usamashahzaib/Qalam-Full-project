import React, { useState, useRef } from 'react';
import { Upload, Trash2, Sparkles, Plus, CheckCircle2, Loader2, BookOpen, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { invokeLLM } from '@/api/ai';
import { toast } from 'sonner';

const STARTER_EXAMPLES = [
  {
    id: 1,
    title: 'The delegation post',
    text: "Three years ago I tried to do everything myself.\n\nI was the first one in, last one out. Checked every email. Approved every decision.\n\nAnd the company barely grew.\n\nThe moment I started trusting my team with real responsibility — not tasks, but outcomes — everything changed.\n\nDelegation isn't about giving work away. It's about giving people the chance to surprise you.\n\nMost of them will.",
    platform: 'LinkedIn',
    engagement: '6.2%',
    tone: 'Reflective',
  },
  {
    id: 2,
    title: 'The hiring red flag post',
    text: "After 200+ interviews, here's the one question that predicts everything:\n\n\"Tell me about a time you disagreed with your manager — and what you did about it.\"\n\nBad answer: \"I just followed their instructions.\"\nGood answer: \"I pushed back, here's how, and here's what happened.\"\n\nYou're not hiring compliance. You're hiring judgment.",
    platform: 'LinkedIn',
    engagement: '7.8%',
    tone: 'Assertive',
  },
];

function ExampleCard({ ex, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="border border-border rounded-lg overflow-hidden bg-card/60"
    >
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[12px] font-medium text-foreground truncate">{ex.title}</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium flex-shrink-0">{ex.tone}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
            <span>{ex.platform}</span>
            <span>·</span>
            <span className="text-primary font-semibold">{ex.engagement} eng.</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors px-2 py-1 rounded hover:bg-muted/40"
          >
            {expanded ? 'Hide' : 'View'}
          </button>
          <button onClick={() => onRemove(ex.id)} className="text-muted-foreground/30 hover:text-destructive transition-colors p-1">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-border/60">
              <p className="text-[11px] text-foreground/70 leading-relaxed whitespace-pre-wrap mt-3">{ex.text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AddExampleModal({ onAdd, onClose }) {
  const [step, setStep] = useState('input'); // 'input' | 'analyzing' | 'done'
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    const reader = new FileReader();
    reader.onload = e => setText(e.target.result?.toString() || '');
    reader.readAsText(file);
  };

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setStep('analyzing');
    try {
      const res = await invokeLLM({
        prompt: `Analyze this social media post and extract metadata. Post: """${text.slice(0, 2000)}"""
Return JSON: { title: "short descriptive title (5 words max)", tone: "one of: Reflective/Assertive/Storytelling/Data-driven/Vulnerable/Contrarian/Inspirational", platform: "LinkedIn or X" }`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            tone: { type: 'string' },
            platform: { type: 'string' },
          },
        },
      });
      setResult(res);
      setStep('done');
    } catch {
      toast.error('Analysis failed', { description: 'Could not analyze your post. Try again.' });
      setStep('input');
    }
  };

  const handleSave = () => {
    onAdd({
      id: Date.now(),
      title: result?.title || text.split('\n')[0].slice(0, 40),
      text,
      platform: result?.platform || 'LinkedIn',
      engagement: '—',
      tone: result?.tone || 'Reflective',
    });
    onClose();
    toast.success('Example saved to Brand Voice library');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-[13px] font-semibold">Add voice example</h3>
          <button onClick={onClose} className="text-muted-foreground/40 hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {step === 'done' && result && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/8 border border-primary/20 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <p className="text-[11px] text-primary">Analyzed: <strong>{result.title}</strong> · {result.tone} · {result.platform}</p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground">Paste your post text</p>
              <button
                onClick={() => fileRef.current?.click()}
                className="text-[10px] text-muted-foreground/50 hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <Upload className="w-3 h-3" /> Upload .txt
              </button>
              <input ref={fileRef} type="file" accept=".txt,.md" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
            <textarea
              value={text}
              onChange={e => { setText(e.target.value); if (step === 'done') setStep('input'); }}
              placeholder="Paste a high-performing post that represents your voice..."
              className="w-full bg-muted border border-border/60 rounded-lg px-3 py-2.5 text-[12px] text-foreground leading-relaxed resize-none outline-none focus:ring-1 focus:ring-primary/40 min-h-[160px] placeholder:text-muted-foreground/30"
            />
            <p className="text-[10px] text-muted-foreground/40 mt-1">{text.length} characters</p>
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2 text-[12px] text-muted-foreground border border-border rounded-md hover:text-foreground transition-colors">Cancel</button>
          {step === 'done' ? (
            <button onClick={handleSave} className="flex-1 py-2 text-[12px] font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              Save to library
            </button>
          ) : (
            <button
              onClick={handleAnalyze}
              disabled={!text.trim() || step === 'analyzing'}
              className="flex-1 py-2 text-[12px] font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {step === 'analyzing' ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing…</> : <><Sparkles className="w-3.5 h-3.5" /> Analyze & save</>}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function BrandVoiceTab() {
  const [examples, setExamples] = useState(STARTER_EXAMPLES);
  const [showAdd, setShowAdd] = useState(false);
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);
  const [voiceProfile, setVoiceProfile] = useState(null);

  const handleRemove = (id) => {
    setExamples(prev => prev.filter(e => e.id !== id));
    toast('Removed from voice library');
  };

  const handleGenerateProfile = async () => {
    if (examples.length < 2) { toast.error('Add at least 2 examples to generate a voice profile.'); return; }
    setIsGeneratingProfile(true);
    const allText = examples.map((e, i) => `Example ${i + 1}:\n${e.text}`).join('\n\n---\n\n');
    try {
      const res = await invokeLLM({
        prompt: `Analyze these ${examples.length} high-performing social media posts and extract a detailed writing style profile. Focus on: sentence structure patterns, vocabulary choices, storytelling techniques, formatting habits, hook styles, and recurring rhetorical devices.

Posts:
${allText}

Return JSON with: { sentence_style: string, vocabulary: string, storytelling: string, hooks: string, recurring_patterns: string[], avoid: string[] }`,
        response_json_schema: {
          type: 'object',
          properties: {
            sentence_style: { type: 'string' },
            vocabulary: { type: 'string' },
            storytelling: { type: 'string' },
            hooks: { type: 'string' },
            recurring_patterns: { type: 'array', items: { type: 'string' } },
            avoid: { type: 'array', items: { type: 'string' } },
          },
        },
      });
      setVoiceProfile(res);
      toast.success('Voice profile updated — active across all drafts');
    } catch {
      toast.error('Profile generation failed', { description: 'Could not analyze your examples. Try again.' });
    } finally {
      setIsGeneratingProfile(false);
    }
  };

  return (
    <div className="space-y-8">

      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-foreground mb-1">Brand Voice Library</p>
          <p className="text-[11px] text-muted-foreground/60 leading-relaxed max-w-md">
            Upload examples of your best-performing posts. Your examples train the writer to match your vocabulary, sentence structure, and storytelling patterns — so every draft sounds like you, not a template.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3 h-3" /> Add example
        </button>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border bg-muted/20">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-foreground">{examples.length} voice examples in library</p>
          <p className="text-[10px] text-muted-foreground/50">
            {examples.length < 3 ? `Add ${3 - examples.length} more for best results` : 'Your library is calibrated — voice matching is active'}
          </p>
        </div>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${examples.length >= 3 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
      </div>

      {/* Examples list */}
      <div className="space-y-2">
        <AnimatePresence>
          {examples.map(ex => (
            <ExampleCard key={ex.id} ex={ex} onRemove={handleRemove} />
          ))}
        </AnimatePresence>

        {examples.length === 0 && (
          <div className="border border-dashed border-border rounded-lg py-10 text-center">
            <BookOpen className="w-6 h-6 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-[12px] text-muted-foreground mb-3">No examples yet</p>
            <button onClick={() => setShowAdd(true)} className="text-[11px] text-primary hover:underline underline-offset-4">Add your first example</button>
          </div>
        )}
      </div>

      {/* Generate voice profile */}
      {examples.length >= 2 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-foreground">Your Writing Profile</p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                Synthesizes your examples into a style fingerprint applied across every draft
              </p>
            </div>
            <button
              onClick={handleGenerateProfile}
              disabled={isGeneratingProfile}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 rounded-md hover:bg-primary/15 transition-colors disabled:opacity-40 flex-shrink-0"
            >
              {isGeneratingProfile ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing…</> : <><Sparkles className="w-3 h-3" /> {voiceProfile ? 'Rebuild profile' : 'Build profile'}</>}
            </button>
          </div>

          <AnimatePresence>
            {voiceProfile && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-5 space-y-4">
                {[
                  { label: 'Sentence style', val: voiceProfile.sentence_style },
                  { label: 'Vocabulary', val: voiceProfile.vocabulary },
                  { label: 'Storytelling', val: voiceProfile.storytelling },
                  { label: 'Hook patterns', val: voiceProfile.hooks },
                ].map(row => row.val && (
                  <div key={row.label}>
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-1">{row.label}</p>
                    <p className="text-[12px] text-foreground/80 leading-relaxed">{row.val}</p>
                  </div>
                ))}

                {voiceProfile.recurring_patterns?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-2">Recurring patterns</p>
                    <div className="flex flex-wrap gap-1.5">
                      {voiceProfile.recurring_patterns.map((p, i) => (
                        <span key={i} className="px-2 py-1 text-[10px] bg-primary/8 text-primary border border-primary/15 rounded-full">{p}</span>
                      ))}
                    </div>
                  </div>
                )}

                {voiceProfile.avoid?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-2">Phrases to avoid</p>
                    <div className="flex flex-wrap gap-1.5">
                      {voiceProfile.avoid.map((p, i) => (
                        <span key={i} className="px-2 py-1 text-[10px] bg-destructive/8 text-destructive/70 border border-destructive/15 rounded-full">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!voiceProfile && (
            <div className="px-5 py-4 text-center">
              <p className="text-[11px] text-muted-foreground/50">Click "Build profile" to generate your writing fingerprint from {examples.length} examples.</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showAdd && <AddExampleModal onAdd={ex => setExamples(prev => [...prev, ex])} onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </div>
  );
}
