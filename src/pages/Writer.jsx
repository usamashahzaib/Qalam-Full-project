import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wand2, Clock, RotateCcw, ChevronDown, Check, ChevronRight, Sparkles, Zap, ImageIcon
} from 'lucide-react';
import RepurposePanel from '@/components/writer/RepurposePanel';
import PredictiveScoring from '@/components/writer/PredictiveScoring';
import VisualStudio from '@/components/writer/VisualStudio';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { invokeLLM } from '@/api/ai';
import { useApp } from '@/lib/AppContext';
import { canAccess } from '@/lib/planGating';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { PLATFORMS, PLATFORM_ORDER } from '@/lib/platforms';
import { LinkedInPreview, TwitterPreview, ThreadsPreview } from '@/components/writer/PlatformPreviews';

const SCHEDULE_SLOTS = [
  { label: 'Tomorrow · 9:00 AM', date: () => format(addDays(new Date(), 1), 'MMM d, yyyy'), time: '9:00 AM' },
  { label: 'Tuesday · 11:00 AM', date: () => format(addDays(new Date(), 3), 'MMM d, yyyy'), time: '11:00 AM' },
  { label: 'Thursday · 8:30 AM', date: () => format(addDays(new Date(), 5), 'MMM d, yyyy'), time: '8:30 AM' },
  { label: 'Next Monday · 9:00 AM', date: () => format(addDays(new Date(), 7), 'MMM d, yyyy'), time: '9:00 AM' },
];

const PLATFORM_ICONS = {
  linkedin: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  twitter: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-7.481zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
    </svg>
  ),
  threads: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.851 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-.505-1.808-1.403-3.232-2.673-4.233-1.286-.981-2.975-1.482-5.010-1.498-2.927.018-5.195.976-6.74 2.848-1.548 1.875-2.333 4.476-2.356 7.733.025 3.254.81 5.852 2.356 7.727 1.544 1.872 3.815 2.831 6.743 2.848 1.908-.018 3.553-.516 4.868-1.482.956-.699 1.63-1.622 2.02-2.774H12.12v-2.014h9.714c.114.578.168 1.16.168 1.733 0 2.605-.832 4.695-2.478 6.218C17.882 23.28 15.315 24 12.186 24z"/>
    </svg>
  ),
};

export default function Writer() {
  const { saveDraft, schedulePost, profile, plan } = useApp();
  const navigate = useNavigate();

  const [platformId, setPlatformId] = useState('linkedin');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [postType, setPostType] = useState('Text post');
  const [tonePreset, setTonePreset] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [toneOpen, setToneOpen] = useState(false);
  const [repurposeOpen, setRepurposeOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState('preview'); // 'preview' | 'score' | 'visuals'
  const [attachedVisuals, setAttachedVisuals] = useState([]);
  const [targetDate, setTargetDate] = useState(null);

  useEffect(() => {
    const load = sessionStorage.getItem('writerLoad');
    if (load) {
      try {
        const { title: t, content: c, type } = JSON.parse(load);
        if (c) setContent(c);
        if (t) setTitle(t);
        if (type) {
          const [platformLabel, postTypeLabel] = type.split(' · ');
          if (platformLabel === 'LinkedIn') setPlatformId('linkedin');
          else if (platformLabel === 'X') setPlatformId('twitter');
          else if (platformLabel === 'Threads') setPlatformId('threads');
          if (postTypeLabel) setPostType(postTypeLabel);
        }
      } catch {}
      sessionStorage.removeItem('writerLoad');
    }

    const date = sessionStorage.getItem('writerScheduleDate');
    if (date) {
      setTargetDate(date);
      sessionStorage.removeItem('writerScheduleDate');
    }
  }, []);

  const handleAttachVisual = (visual) => setAttachedVisuals(prev => [...prev, visual]);
  const handleDetachVisual = (index) => setAttachedVisuals(prev => prev.filter((_, i) => i !== index));

  const platform = PLATFORMS[platformId];
  const charLimit = platform.charLimit;
  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const overLimit = charCount > charLimit;
  const nearLimit = charCount > charLimit * 0.85 && !overLimit;

  // Scores (simulated, content-length-driven)
  const hookScore = content.length > 50 ? Math.min(95, 60 + Math.floor(content.split('\n')[0]?.length / 3)) : 0;
  const authenticityScore = content.length > 100 ? 87 : 0;
  const antiAiScore = content.length > 100 ? 91 : 0;

  const handlePlatformSwitch = (id) => {
    setPlatformId(id);
    setTonePreset(null);
    setPostType(PLATFORMS[id].postTypes[0]);
    setContent('');
    setTitle('');
    setSavedId(null);
  };

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    const activeTone = tonePreset || platform.tonePresets[0];
    try {
      const res = await invokeLLM({
        prompt: platform.promptInstructions(activeTone, profile),
      });
      const text = typeof res === 'string' ? res : (res?.response || res?.text || '');
      setContent(text);
      setSavedId(null);
      if (!title) setTitle(text.split('\n')[0].slice(0, 80));
    } catch {
      toast.error('Generation failed. Check your connection.');
    }
    setIsGenerating(false);
  }, [platform, tonePreset, title, profile]);

  const handleSave = () => {
    if (!content.trim()) { toast.error('Nothing to save yet.'); return; }
    saveDraft(title || content.split('\n')[0].slice(0, 80), content, `${platform.label} · ${postType}`);
    setSavedId(true);
  };

  const handleScheduleSelect = (slot) => {
    if (!content.trim()) { toast.error('Write something first.'); return; }
    schedulePost(
      title || content.split('\n')[0].slice(0, 80),
      content,
      `${platform.label} · ${postType}`,
      slot.date(),
      slot.time
    );
    setScheduleOpen(false);
    setTimeout(() => navigate('/calendar'), 700);
  };

  const activeTone = tonePreset || platform.tonePresets[0];

  return (
    <div className="flex h-full overflow-hidden">

      {/* Left: Platform rail */}
      <div className="flex-shrink-0 w-[44px] border-r border-border bg-card/30 flex flex-col items-center pt-3 gap-1">
        {PLATFORM_ORDER.map((pid) => {
          const active = pid === platformId;
          return (
            <button
              key={pid}
              onClick={() => handlePlatformSwitch(pid)}
              title={PLATFORMS[pid].label}
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                active
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40'
              }`}
            >
              {PLATFORM_ICONS[pid]}
            </button>
          );
        })}
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Toolbar */}
        <div className="flex-shrink-0 h-10 border-b border-border flex items-center justify-between px-5 bg-background">
          <div className="flex items-center gap-3">
            {/* Platform label */}
            <span className="text-[11px] font-medium text-foreground/70">{platform.label}</span>
            <div className="w-px h-3.5 bg-border" />

            {/* Post type */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                  {postType}
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {platform.postTypes.map(t => (
                  <DropdownMenuItem key={t} className="text-xs" onClick={() => setPostType(t)}>{t}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-3.5 bg-border" />

            {/* Tone preset */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors max-w-[140px]">
                  <span className="truncate">{activeTone.label}</span>
                  <ChevronDown className="w-3 h-3 flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {platform.tonePresets.map(preset => (
                  <DropdownMenuItem
                    key={preset.id}
                    className="flex flex-col items-start gap-0.5 py-2.5 cursor-pointer"
                    onClick={() => setTonePreset(preset)}
                  >
                    <span className={`text-[12px] font-medium ${activeTone.id === preset.id ? 'text-primary' : ''}`}>
                      {preset.label}
                      {activeTone.id === preset.id && <Check className="w-3 h-3 inline ml-1.5" />}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{preset.desc}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-0.5">
            <ToolbarBtn
              onClick={() => { setRepurposeOpen(false); setRightPanel('score'); }}
              icon={<Zap className="w-3 h-3" strokeWidth={1.5} />}
              label="Signal"
              title="Post signal score"
            />
            <div className="w-px h-3.5 bg-border mx-0.5" />
            <ToolbarBtn
              onClick={() => { setRepurposeOpen(false); setRightPanel('visuals'); }}
              icon={<ImageIcon className="w-3 h-3" strokeWidth={1.5} />}
              label={attachedVisuals.length > 0 ? `Visuals (${attachedVisuals.length})` : 'Visuals'}
              title="Visual studio"
            />
            {platformId === 'linkedin' && (
              <>
                <div className="w-px h-3.5 bg-border mx-1" />
                <ToolbarBtn
                  onClick={() => setRepurposeOpen(r => !r)}
                  icon={<Sparkles className="w-3 h-3" strokeWidth={1.5} />}
                  label="Repurpose"
                  title="Convert to X thread + Threads post"
                />
              </>
            )}
            <div className="w-px h-3.5 bg-border mx-1" />
            <ToolbarBtn
              onClick={handleGenerate}
              disabled={isGenerating}
              icon={isGenerating
                ? <div className="w-3 h-3 border border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
                : <Wand2 className="w-3 h-3" strokeWidth={1.5} />
              }
              label={isGenerating ? 'Drafting…' : 'Draft'}
            />
            <ToolbarBtn
              onClick={() => { setContent(''); setTitle(''); setSavedId(null); }}
              disabled={!content}
              icon={<RotateCcw className="w-3 h-3" strokeWidth={1.5} />}
              title="Clear canvas"
            />
            <ToolbarBtn
              onClick={handleSave}
              disabled={!content.trim()}
              icon={savedId
                ? <Check className="w-3 h-3 text-primary" strokeWidth={2.5} />
                : <Save className="w-3 h-3" strokeWidth={1.5} />
              }
              label={savedId ? 'Saved' : 'Save draft'}
            />
            <button
              onClick={() => {
                if (!canAccess(plan, 'scheduling')) {
                  toast.error('Scheduling requires Pro', { description: 'Upgrade in Settings → Billing.' });
                  return;
                }
                setScheduleOpen(true);
              }}
              disabled={!content.trim() || overLimit}
              className="flex items-center gap-1.5 ml-2 px-3 py-1.5 text-[11px] font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Clock className="w-3 h-3" strokeWidth={1.5} />
              Schedule
            </button>
          </div>
        </div>

        {/* Target date banner – set from ContentCalendar */}
        {targetDate && (
          <div className="flex-shrink-0 flex items-center justify-between px-8 lg:px-16 py-1.5 bg-primary/5 border-b border-primary/15">
            <span className="text-[11px] text-primary/80">
              Writing for <span className="font-medium text-primary">{targetDate}</span>
            </span>
            <button
              onClick={() => setTargetDate(null)}
              className="text-primary/40 hover:text-primary transition-colors text-[12px] leading-none"
            >✕</button>
          </div>
        )}

        {/* Title */}
        <div className="flex-shrink-0 border-b border-border/40 px-8 lg:px-16 py-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Working title…"
            className="w-full max-w-[640px] block bg-transparent text-[11px] text-muted-foreground/50 outline-none placeholder:text-muted-foreground/20 tracking-wide"
          />
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto px-8 lg:px-16 py-12">
          <textarea
            value={content}
            onChange={e => { setContent(e.target.value); if (savedId) setSavedId(null); }}
            placeholder={
              platformId === 'twitter'
                ? 'Start with your sharpest line. Every word earns its place.'
                : platformId === 'threads'
                ? "Write like you're texting a smart friend."
                : 'Start writing. The best posts begin with a single, honest line.'
            }
            className="w-full max-w-[640px] bg-transparent text-foreground text-[16px] leading-[1.9] resize-none outline-none placeholder:text-muted-foreground/20 min-h-[520px] caret-primary block"
            style={{ fontFamily: 'var(--font-sans)' }}
            autoFocus
          />
        </div>

        {/* Attached visuals strip */}
        {attachedVisuals.length > 0 && (
          <div className="flex-shrink-0 border-t border-border/50 px-8 lg:px-16 py-2 flex items-center gap-2 bg-background">
            <ImageIcon className="w-3 h-3 text-primary/60 flex-shrink-0" />
            <span className="text-[10px] text-primary/70 font-medium">{attachedVisuals.length} visual{attachedVisuals.length > 1 ? 's' : ''} attached</span>
            <div className="flex gap-1.5 ml-1">
              {attachedVisuals.map((v, i) => (
                v.type === 'image'
                  ? <img key={i} src={v.url} alt="" className="w-6 h-6 rounded object-cover border border-primary/30" />
                  : <div key={i} className="w-6 h-6 rounded bg-primary/15 border border-primary/30 flex items-center justify-center">
                      <span className="text-[7px] text-primary font-bold">{v.slides?.length}s</span>
                    </div>
              ))}
            </div>
          </div>
        )}

        {/* Status bar */}
        <div className="flex-shrink-0 h-8 border-t border-border flex items-center justify-between px-5 bg-background">
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-muted-foreground/50">{wordCount} words</span>
            <span className={`tabular-nums font-medium ${overLimit ? 'text-destructive' : nearLimit ? 'text-primary' : 'text-muted-foreground/50'}`}>
              {charCount} / {charLimit}
            </span>
            {overLimit && <span className="text-destructive font-medium">Over {platform.label} limit</span>}
          </div>

          <AnimatePresence>
            {content.length > 80 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-5 text-[11px]"
              >
                <ScorePill label="Hook" value={hookScore} />
                <ScorePill label="Voice" value={authenticityScore} />
                <ScorePill label="Clarity" value={antiAiScore} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Preview / Repurpose / Score panel */}
      <div className="hidden lg:flex w-[320px] flex-col border-l border-border bg-card/20 flex-shrink-0">
        {repurposeOpen && platformId === 'linkedin' ? (
          <RepurposePanel
            sourceContent={content}
            onClose={() => setRepurposeOpen(false)}
          />
        ) : (
          <>
            {/* Panel tab bar */}
            <div className="h-10 border-b border-border flex items-center px-2 gap-0.5 flex-shrink-0">
              {[
                { id: 'preview', label: 'Preview' },
                { id: 'score', label: '⚡ Signal' },
                { id: 'visuals', label: `🖼${attachedVisuals.length > 0 ? ` ${attachedVisuals.length}` : ''} Visuals` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setRightPanel(tab.id)}
                  className={`px-3 py-1.5 text-[10px] rounded-md transition-colors font-medium ${
                    rightPanel === tab.id
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground/50 hover:text-muted-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              {rightPanel === 'preview' && content.length > 0 && (
                <span className="ml-auto mr-2 text-[9px] text-primary tracking-widest uppercase font-semibold">Live</span>
              )}
            </div>

            {rightPanel === 'preview' && (
              <div className="flex-1 overflow-y-auto p-4">
                {platformId === 'linkedin' && <LinkedInPreview content={content} authorName={profile?.name || 'Alex Kim'} authorTitle={profile?.title || 'VP of Growth'} />}
                {platformId === 'twitter' && <TwitterPreview content={content} authorName={profile?.name || 'Alex Kim'} />}
                {platformId === 'threads' && <ThreadsPreview content={content} authorName={profile?.name || 'Alex Kim'} />}
              </div>
            )}

            {rightPanel === 'score' && (
              <PredictiveScoring content={content} platform={platformId} />
            )}

            {rightPanel === 'visuals' && (
              <VisualStudio
                content={content}
                platform={platformId}
                attachedVisuals={attachedVisuals}
                onAttach={handleAttachVisual}
                onDetach={handleDetachVisual}
              />
            )}
          </>
        )}
      </div>

      {/* Schedule modal */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="bg-card border-border max-w-xs p-0 overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="text-[13px] font-semibold">Schedule for {platform.label}</DialogTitle>
            <p className="text-[11px] text-muted-foreground mt-1">Pick a high-engagement window for your audience.</p>
          </div>
          <div className="p-3">
            {targetDate && (
              <button
                onClick={() => handleScheduleSelect({ label: `${targetDate} · 9:00 AM`, date: () => targetDate, time: '9:00 AM' })}
                className="w-full flex items-center justify-between px-4 py-3 mb-1 rounded-md bg-primary/8 border border-primary/20 hover:bg-primary/15 transition-colors text-left group"
              >
                <div>
                  <p className="text-[10px] text-primary font-semibold tracking-wide uppercase mb-0.5">Your target date</p>
                  <span className="text-[13px] text-foreground">{targetDate} · 9:00 AM</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-primary" />
              </button>
            )}
            {SCHEDULE_SLOTS.map((slot, i) => (
              <button
                key={i}
                onClick={() => handleScheduleSelect(slot)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-md hover:bg-muted/40 transition-colors text-left group"
              >
                <span className="text-[13px] text-foreground">{slot.label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
              </button>
            ))}
          </div>
          <div className="mx-3 mb-3 px-3 py-2.5 rounded-md bg-muted/30 border border-border/60">
            <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
              Direct publishing to {platform.label} requires connecting your account. Go to <span className="text-primary">Settings → Integrations</span> to enable auto-publish.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToolbarBtn({ onClick, disabled, icon, label, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-25 disabled:cursor-not-allowed rounded-md hover:bg-muted/40"
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}

function ScorePill({ label, value }) {
  const color = value >= 85 ? 'text-primary' : value >= 65 ? 'text-foreground/80' : 'text-muted-foreground';
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-muted-foreground/50">{label}</span>
      <span className={`font-semibold tabular-nums ${color}`}>{value}</span>
    </span>
  );
}

// Inline Save icon component
function Save({ className, strokeWidth }) {
  return (
    <svg className={className || 'w-3 h-3'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth || 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  );
}