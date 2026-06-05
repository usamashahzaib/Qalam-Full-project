import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, PenLine, Calendar, TrendingUp, Fingerprint } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '@/lib/AppContext';
import { format } from 'date-fns';

const todayIdea = {
  topic: 'Why most founders confuse "building in public" with "bragging in public"',
  hook: "I've watched 200+ founders share their journey online. Most get it wrong — and they never figure out why.",
};

const wu = (delay = 0) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.3, ease: 'easeOut' },
});

export default function Dashboard() {
  const { drafts, scheduled, published, posts, profile } = useApp();
  const firstName = (profile?.name || 'Alex').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = format(new Date(), 'EEEE, MMMM d');

  const recent = [...drafts, ...scheduled]
    .sort((a, b) => (b.id > a.id ? 1 : -1))
    .slice(0, 5);

  const engValues = published
    .map(p => { const m = (p.engagement || '').match(/([\d.]+)\s*%/); return m ? parseFloat(m[1]) : null; })
    .filter(v => v != null);
  const avgEng = engValues.length > 0
    ? (engValues.reduce((a, b) => a + b, 0) / engValues.length).toFixed(1)
    : null;

  const stats = [
    { label: 'Posts published', value: String(published.length), change: published.length > 0 ? 'in your library' : 'none yet' },
    { label: 'Avg. engagement', value: avgEng ? `${avgEng}%` : '—', change: engValues.length > 0 ? `from ${engValues.length} tracked` : 'add engagement to published posts' },
    { label: 'Scheduled', value: String(scheduled.length), change: scheduled.length > 0 ? 'queued to publish' : 'nothing queued' },
    { label: 'Drafts', value: String(drafts.length), change: drafts.length > 0 ? 'in progress' : 'start writing' },
  ];

  return (
    <div className="min-h-full px-6 py-10 sm:px-10 lg:px-14 lg:py-14 max-w-[860px] mx-auto">

      {/* Greeting */}
      <motion.div {...wu(0)} className="mb-16">
        <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase mb-4">{today}</p>
        <h1 className="font-serif text-[32px] font-medium tracking-tight leading-tight">
          {greeting}, {firstName}.
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {scheduled.length > 0
            ? `${scheduled.length} post${scheduled.length !== 1 ? 's' : ''} scheduled this week.`
            : 'Your publishing queue is empty — schedule something.'}
        </p>
      </motion.div>

      {/* Today's signal */}
      <motion.div {...wu(0.06)} className="mb-14">
        <p className="text-[10px] tracking-[0.2em] text-primary uppercase font-semibold mb-5">
          Today's signal
        </p>
        <div className="pl-5 border-l-2 border-primary/30">
          <p className="text-[15px] font-medium leading-relaxed text-foreground mb-2">
            {todayIdea.topic}
          </p>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
            {todayIdea.hook}
          </p>
          <div className="flex flex-wrap items-center gap-5">
            <Link
              to="/writer"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-foreground hover:text-primary transition-colors group"
            >
              <PenLine className="w-3.5 h-3.5" strokeWidth={1.5} />
              Begin writing
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </motion.div>

      <motion.div {...wu(0.1)} className="h-px bg-border mb-14" />

      {/* Stats */}
      <motion.div {...wu(0.13)} className="mb-14">
        <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase font-medium mb-6">
          Last 7 days
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 border border-border rounded-lg overflow-hidden">
          {stats.map((s, i) => (
            <div
              key={i}
              className={`px-6 py-5 ${i < 3 ? 'border-r border-border' : ''} ${i >= 2 ? 'border-t border-border lg:border-t-0' : ''}`}
            >
              <p className="text-[11px] text-muted-foreground mb-3">{s.label}</p>
              <p className="text-[26px] font-light tracking-tight text-foreground leading-none mb-1.5">
                {s.value}
              </p>
              <p className="text-[11px] text-primary font-medium">{s.change} vs prior period</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div {...wu(0.16)} className="h-px bg-border mb-14" />

      {/* Recent work */}
      <motion.div {...wu(0.19)} className="mb-14">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase font-medium">
            Recent work
          </p>
          <Link
            to="/library"
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="border border-border border-dashed rounded-lg px-6 py-12 text-center">
            <p className="text-[13px] text-muted-foreground mb-4">
              Nothing here yet. Your drafts and scheduled posts will appear here.
            </p>
            <Link
              to="/writer"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline underline-offset-4"
            >
              <PenLine className="w-3 h-3" />
              Write your first post
            </Link>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
            {recent.map((d) => (
              <Link
                key={d.id}
                to="/writer"
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors group"
              >
                <div className="min-w-0 mr-6">
                  <p className="text-[13px] text-foreground truncate font-medium">{d.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {d.date}{d.scheduledTime ? ` · ${d.scheduledTime}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className={`text-[10px] tracking-[0.12em] uppercase font-medium ${
                    d.status === 'scheduled' ? 'text-primary' : 'text-muted-foreground/50'
                  }`}>
                    {d.status}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div {...wu(0.21)} className="h-px bg-border mb-14" />

      {/* Quick nav */}
      <motion.div {...wu(0.24)}>
        <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase font-medium mb-6">
          Workspace
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 border border-border rounded-lg overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-border">
          {[
            { icon: Calendar, label: 'Calendar', desc: scheduled.length > 0 ? `${scheduled.length} scheduled` : 'Nothing scheduled', path: '/calendar' },
            { icon: Fingerprint, label: 'Voice DNA', desc: '94 consistency score', path: '/voice' },
            { icon: TrendingUp, label: 'Analytics', desc: 'Engagement +12%', path: '/analytics' },
          ].map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-4 px-6 py-5 hover:bg-muted/20 transition-colors group"
            >
              <item.icon
                className="w-4 h-4 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors flex-shrink-0"
                strokeWidth={1.5}
              />
              <div>
                <p className="text-[13px] text-foreground font-medium">{item.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

    </div>
  );
}