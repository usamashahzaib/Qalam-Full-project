import React, { useState } from 'react';
import { Plus, Trash2, ExternalLink, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useApp } from '@/lib/AppContext';
import { PlanGatePage } from '@/components/ui/PlanGate';
import { canAccess } from '@/lib/planGating';

const PLATFORM_OPTIONS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'other', label: 'Other' },
];

const PLATFORM_BADGE = {
  linkedin: 'bg-blue-900/40 text-blue-300',
  twitter: 'bg-zinc-800 text-zinc-400',
  instagram: 'bg-purple-900/40 text-purple-300',
  other: 'bg-muted text-muted-foreground',
};

const PLATFORM_LABEL = {
  linkedin: 'LI',
  twitter: 'X',
  instagram: 'IG',
  other: '—',
};

const wu = (d = 0) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: d, duration: 0.28, ease: 'easeOut' },
});

function CompetitorCard({ comp, onRemove }) {
  const url = comp.url
    ? comp.url.startsWith('http') ? comp.url : `https://${comp.url}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="border border-border rounded-xl bg-card overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-[12px] font-semibold text-foreground/60 flex-shrink-0">
            {comp.avatar}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-foreground truncate">{comp.name}</p>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${PLATFORM_BADGE[comp.platform] || PLATFORM_BADGE.other}`}>
                {PLATFORM_LABEL[comp.platform] || '—'}
              </span>
            </div>
            {comp.handle && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{comp.handle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={() => onRemove(comp.id)}
            className="text-muted-foreground/30 hover:text-destructive transition-colors p-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {comp.url && (
        <div className="px-5 pb-4 -mt-1">
          <p className="text-[11px] text-muted-foreground/40 truncate">
            {comp.url.replace(/^https?:\/\//, '')}
          </p>
        </div>
      )}
    </motion.div>
  );
}

function AddCompetitorModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ name: '', handle: '', url: '', platform: 'linkedin' });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleAdd = () => {
    const name = form.name.trim();
    if (!name) return;
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    onAdd({
      id: Date.now(),
      name,
      handle: form.handle.trim() || '',
      url: form.url.trim() || '',
      platform: form.platform,
      avatar: initials,
    });
    onClose();
    toast.success('Added to your research list.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl"
      >
        <h3 className="text-[14px] font-semibold mb-1">Add a profile to watch</h3>
        <p className="text-[11px] text-muted-foreground mb-5">
          Track people you want to reference as you research and plan your content.
        </p>

        <div className="space-y-3 mb-5">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 block">Name *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Sarah Chen"
              autoFocus
              className="w-full bg-muted border border-border rounded-md px-3 py-2.5 text-[12px] outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/30"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 block">Handle</label>
            <input
              value={form.handle}
              onChange={e => set('handle', e.target.value)}
              placeholder="@username"
              className="w-full bg-muted border border-border rounded-md px-3 py-2.5 text-[12px] outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/30"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 block">Profile URL</label>
            <input
              value={form.url}
              onChange={e => set('url', e.target.value)}
              placeholder="linkedin.com/in/username"
              className="w-full bg-muted border border-border rounded-md px-3 py-2.5 text-[12px] outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/30"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 block">Platform</label>
            <select
              value={form.platform}
              onChange={e => set('platform', e.target.value)}
              className="w-full bg-muted border border-border rounded-md px-3 py-2.5 text-[12px] outline-none focus:ring-1 focus:ring-primary text-foreground"
            >
              {PLATFORM_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-[12px] text-muted-foreground border border-border rounded-md hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!form.name.trim()}
            className="flex-1 py-2 text-[12px] font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function Competitors() {
  const { plan } = useApp();
  const [competitors, setCompetitors] = useState([]);
  const [showAdd, setShowAdd] = useState(false);

  if (!canAccess(plan, 'competitor_monitor')) return <PlanGatePage feature="competitor_monitor" />;

  const handleRemove = (id) => {
    setCompetitors(prev => prev.filter(c => c.id !== id));
    toast('Removed from research list.');
  };

  return (
    <div className="min-h-full px-6 py-10 sm:px-10 lg:px-14 lg:py-14 max-w-[860px] mx-auto">

      <motion.div {...wu(0)} className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-12">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase font-medium mb-4">Research</p>
          <h1 className="font-serif text-[32px] font-medium tracking-tight leading-none">Competitor Monitor</h1>
          <p className="text-[13px] text-muted-foreground mt-2">
            Track the people you watch. Add their profiles for reference as you research and plan your content.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors self-start sm:self-auto flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Add profile
        </button>
      </motion.div>

      <motion.div {...wu(0.06)}>
        {competitors.length === 0 ? (
          <div className="border border-border border-dashed rounded-xl px-8 py-16 text-center">
            <BarChart2 className="w-8 h-8 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-[13px] text-muted-foreground mb-1">No profiles tracked yet.</p>
            <p className="text-[11px] text-muted-foreground/50 mb-5">
              Add people whose content you study — founders, peers, operators in your space.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="text-[12px] text-primary font-medium hover:underline underline-offset-4"
            >
              Add your first profile
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {competitors.map(comp => (
                <CompetitorCard key={comp.id} comp={comp} onRemove={handleRemove} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showAdd && (
          <AddCompetitorModal
            onAdd={c => setCompetitors(prev => [...prev, c])}
            onClose={() => setShowAdd(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
