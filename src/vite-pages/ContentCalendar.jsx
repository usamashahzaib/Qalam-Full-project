import React, { useState, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, PenLine, Trash2, Sparkles
} from 'lucide-react';
import BestTimeRecommender from '@/components/calendar/BestTimeRecommendor';
import {
  format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  isSameDay, isSameMonth, addMonths, subMonths, isToday
} from 'date-fns';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/lib/AppContext';
import { PlanGatePage } from '@/components/ui/PlanGate';
import { canAccess } from '@/lib/planGating';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const STATUS_STYLE = {
  scheduled:  { dot: 'bg-primary',        bar: 'border-l-primary/60 bg-primary/8' },
  draft:      { dot: 'bg-muted-foreground/40', bar: 'border-l-muted-foreground/30 bg-muted/20' },
  published:  { dot: 'bg-emerald-500/70',  bar: 'border-l-emerald-500/40 bg-emerald-500/5' },
};

const STATUS_LABEL = {
  scheduled: { text: 'Scheduled', color: 'text-primary' },
  draft:     { text: 'Draft',     color: 'text-muted-foreground/50' },
  published: { text: 'Published', color: 'text-foreground/60' },
};

function buildCalendarDays(month) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = [];
  let d = start;
  while (d <= end) { days.push(d); d = addDays(d, 1); }
  return days;
}

const getPostDate = (post) => {
  if (post.scheduledDate) {
    return post.scheduledDate instanceof Date ? post.scheduledDate : new Date(post.scheduledDate);
  }
  // Try to parse from date string for published/draft
  if (post.date) {
    const parsed = new Date(post.date);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
};

export default function ContentCalendar() {
  const { posts, deletePost, updatePost, schedulePost, plan } = useApp();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState(null);
  const [quickAddDate, setQuickAddDate] = useState(null);
  const [dragPostId, setDragPostId] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [showRecommender, setShowRecommender] = useState(false);
  const dragRef = useRef(null);

  if (!canAccess(plan, 'calendar')) return <PlanGatePage feature="calendar" />;

  const calendarDays = buildCalendarDays(currentMonth);

  const postsForDay = (day) =>
    posts.filter(p => {
      const d = getPostDate(p);
      return d && isSameDay(d, day);
    });

  // Drag handlers
  const handleDragStart = (e, post) => {
    setDragPostId(post.id);
    dragRef.current = post;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, day) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(day);
  };

  const handleDrop = (e, day) => {
    e.preventDefault();
    const post = dragRef.current;
    if (!post) return;
    updatePost(post.id, {
      scheduledDate: day,
      date: format(day, 'MMM d, yyyy'),
      status: post.status === 'draft' ? 'scheduled' : post.status,
      scheduledTime: post.scheduledTime || '9:00 AM',
    });
    toast.success('Post rescheduled', { description: `Moved to ${format(day, 'MMM d')}` });
    setDragPostId(null);
    setDragOverDate(null);
    dragRef.current = null;
  };

  const handleDragEnd = () => {
    setDragPostId(null);
    setDragOverDate(null);
    dragRef.current = null;
  };

  const handleDelete = (id) => { deletePost(id); setSelectedPost(null); };

  const handlePublishNow = (post) => {
    updatePost(post.id, {
      status: 'published',
      scheduledDate: null,
      scheduledTime: null,
      date: format(new Date(), 'MMM d, yyyy'),
      engagement: '—',
    });
    toast.success('Marked as published');
    setSelectedPost(null);
  };

  const handleQuickPost = (date) => {
    sessionStorage.setItem('writerScheduleDate', format(date, 'MMM d, yyyy'));
    navigate('/writer');
  };

  const totalScheduled = posts.filter(p => p.status === 'scheduled').length;
  const totalDrafts = posts.filter(p => p.status === 'draft').length;
  const totalPublished = posts.filter(p => p.status === 'published').length;

  return (
    <div className="min-h-full px-4 py-8 sm:px-8 lg:px-12 lg:py-12 max-w-[1200px] mx-auto">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase font-medium mb-3">Content Calendar</p>
            <h1 className="font-serif text-[32px] font-medium tracking-tight leading-none">Publishing Schedule</h1>
          </div>
          <button
            onClick={() => navigate('/writer')}
            className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors self-start sm:self-auto flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} /> New post
          </button>
        </div>

        {/* Summary pills */}
        <div className="flex items-center gap-4 mb-7 text-[11px]">
          {[
            { label: 'Scheduled', val: totalScheduled, color: 'text-primary' },
            { label: 'Drafts', val: totalDrafts, color: 'text-muted-foreground' },
            { label: 'Published', val: totalPublished, color: 'text-foreground/60' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className={`font-semibold tabular-nums text-[14px] ${s.color}`}>{s.val}</span>
              <span className="text-muted-foreground/50">{s.label}</span>
            </div>
          ))}
          <div className="ml-auto text-[10px] text-muted-foreground/40 hidden sm:block">
            Drag posts between dates to reschedule · Click a day to add a post
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-5 text-[10px] text-muted-foreground/50">
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${STATUS_STYLE[k].dot}`} />
              {v.text}
            </div>
          ))}
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[15px] font-semibold min-w-[148px] text-center tracking-tight">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1 rounded hover:bg-muted"
          >
            Today
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="text-center text-[10px] text-muted-foreground/40 font-medium py-1 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 border border-border rounded-xl overflow-hidden">
          {calendarDays.map((day, idx) => {
            const dayPosts = postsForDay(day);
            const inMonth = isSameMonth(day, currentMonth);
            const todayDay = isToday(day);
            const isDragOver = dragOverDate && isSameDay(dragOverDate, day);
            const isLastCol = (idx + 1) % 7 === 0;
            const isLastRow = idx >= calendarDays.length - 7;

            return (
              <div
                key={idx}
                onDragOver={(e) => handleDragOver(e, day)}
                onDrop={(e) => handleDrop(e, day)}
                onDragLeave={() => setDragOverDate(null)}
                className={`min-h-[110px] flex flex-col border-b border-r border-border transition-colors
                  ${isLastCol ? 'border-r-0' : ''}
                  ${isLastRow ? 'border-b-0' : ''}
                  ${!inMonth ? 'bg-muted/10' : 'bg-card'}
                  ${isDragOver ? 'bg-primary/8 ring-1 ring-inset ring-primary/30' : ''}
                `}
              >
                {/* Day number */}
                <div className="flex items-center justify-between px-2 pt-2 pb-1">
                  <button
                    onClick={() => handleQuickPost(day)}
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-medium transition-colors group hover:ring-1 hover:ring-primary/40
                      ${todayDay ? 'bg-primary text-primary-foreground' : !inMonth ? 'text-muted-foreground/25' : 'text-muted-foreground/70 hover:text-foreground'}
                    `}
                    title={`Write for ${format(day, 'MMM d')}`}
                  >
                    {format(day, 'd')}
                  </button>
                  {dayPosts.length === 0 && inMonth && (
                    <button
                      onClick={() => handleQuickPost(day)}
                      className="opacity-0 hover:opacity-100 group-hover:opacity-100 text-muted-foreground/20 hover:text-primary transition-all text-[14px] leading-none pr-0.5"
                      title="Add post"
                    >
                      +
                    </button>
                  )}
                </div>

                {/* Posts in this day */}
                <div className="flex-1 px-1.5 pb-1.5 space-y-1 overflow-hidden">
                  {dayPosts.slice(0, 3).map((post) => {
                    const s = STATUS_STYLE[post.status] || STATUS_STYLE.draft;
                    return (
                      <div
                        key={post.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, post)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedPost(post)}
                        className={`px-1.5 py-1 rounded border-l-2 cursor-pointer transition-all
                          ${s.bar}
                          ${dragPostId === post.id ? 'opacity-40 scale-95' : 'hover:brightness-110 active:scale-95'}
                        `}
                      >
                        <p className="text-[10px] font-medium text-foreground/85 truncate leading-tight">{post.title}</p>
                        {post.scheduledTime && (
                          <p className="text-[9px] text-primary/60 mt-0.5">{post.scheduledTime}</p>
                        )}
                      </div>
                    );
                  })}
                  {dayPosts.length > 3 && (
                    <p className="text-[9px] text-muted-foreground/40 px-1.5">+{dayPosts.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </motion.div>

      {/* Post detail dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => { setSelectedPost(null); setShowRecommender(false); }}>
        <DialogContent className="bg-card border-border max-w-xs p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-border">
            <DialogTitle className="text-[13px] font-semibold pr-6 leading-snug">
              {selectedPost?.title}
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {selectedPost?.date}
              {selectedPost?.scheduledTime ? ` · ${selectedPost.scheduledTime}` : ''}
            </p>
          </div>

          <div className="px-5 py-4 space-y-2.5 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className={`font-medium ${STATUS_LABEL[selectedPost?.status]?.color}`}>
                {STATUS_LABEL[selectedPost?.status]?.text}
              </span>
            </div>
            {selectedPost?.type && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="text-foreground/70">{selectedPost.type}</span>
              </div>
            )}
            {selectedPost?.engagement && selectedPost.engagement !== '—' && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Engagement</span>
                <span className="text-primary font-semibold">{selectedPost.engagement}</span>
              </div>
            )}
          </div>

          {/* Best Time Recommender */}
          <div className="px-4 pb-2 relative">
            <button
              onClick={() => setShowRecommender(r => !r)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] text-primary border border-primary/25 bg-primary/5 rounded-md hover:bg-primary/10 transition-colors"
            >
              <Sparkles className="w-3 h-3" /> Best time to post
            </button>
            <AnimatePresence>
              {showRecommender && (
                <BestTimeRecommender
                  platform={selectedPost?.type || 'linkedin'}
                  onSelectSlot={(slot) => {
                    const [day, time] = slot.split(' · ');
                    updatePost(selectedPost.id, { scheduledTime: time });
                    setShowRecommender(false);
                    toast.success(`Scheduled for ${slot}`);
                  }}
                  onClose={() => setShowRecommender(false)}
                />
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-2 px-4 pb-4">
            <button
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] text-muted-foreground border border-border rounded-md hover:text-foreground transition-colors"
              onClick={() => { setSelectedPost(null); navigate('/writer'); }}
            >
              <PenLine className="w-3 h-3" /> Edit
            </button>
            {selectedPost?.status === 'scheduled' && (
              <button
                className="flex-1 px-3 py-2 text-[12px] bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
                onClick={() => handlePublishNow(selectedPost)}
              >
                Publish now
              </button>
            )}
            <button
              className="px-2.5 text-muted-foreground/50 hover:text-destructive border border-border rounded-md transition-colors"
              onClick={() => handleDelete(selectedPost?.id)}
              title="Delete post"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}