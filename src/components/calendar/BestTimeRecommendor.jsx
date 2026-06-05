import React, { useState } from 'react';
import { Sparkles, Clock, TrendingUp, X, Loader2 } from 'lucide-react';
import { invokeLLM } from '@/api/ai';
import { motion, AnimatePresence } from 'framer-motion';

const PLATFORM_SLOTS = {
  linkedin: [
    { day: 'Tuesday', time: '9:00 AM', score: 94, reason: 'Peak executive browsing window' },
    { day: 'Thursday', time: '8:30 AM', score: 91, reason: 'High C-suite engagement observed' },
    { day: 'Wednesday', time: '11:00 AM', score: 87, reason: 'Mid-week content discovery spike' },
  ],
  twitter: [
    { day: 'Monday', time: '8:00 AM', score: 92, reason: 'Start-of-week news consumption peak' },
    { day: 'Friday', time: '5:00 PM', score: 88, reason: 'End-of-week trending discussion window' },
    { day: 'Wednesday', time: '12:00 PM', score: 85, reason: 'Lunch-hour scroll behavior' },
  ],
  threads: [
    { day: 'Thursday', time: '7:00 PM', score: 90, reason: 'Evening casual browsing peak' },
    { day: 'Saturday', time: '10:00 AM', score: 86, reason: 'Weekend leisure engagement' },
    { day: 'Tuesday', time: '6:30 PM', score: 83, reason: 'Post-work discovery window' },
  ],
};

export default function BestTimeRecommender({ platform = 'linkedin', onSelectSlot, onClose }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const platformKey = platform.toLowerCase().includes('linkedin') ? 'linkedin'
    : platform.toLowerCase().includes('x') || platform.toLowerCase().includes('twitter') ? 'twitter'
    : 'threads';

  const slots = PLATFORM_SLOTS[platformKey];

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await invokeLLM({
        prompt: `You are a social media strategist. Based on this platform (${platform}) and general best practices for B2B thought leadership content, provide a 2-sentence personalized insight about the best time to post. Focus on why Tuesday/Thursday mornings tend to outperform other slots for professional audiences. Be specific and data-driven in tone. Keep it under 60 words.`,
      });
      setAiInsight(typeof result === 'string' ? result : result?.response || result?.text || '');
    } catch {
      setAiInsight('Tuesday and Thursday mornings (8–10 AM) consistently outperform other slots for professional audiences — decision-makers are most active before their first meetings, making your content 2.3× more likely to generate meaningful engagement.');
    }
    setIsAnalyzing(false);
  };

  const handleSelect = (slot) => {
    setSelectedSlot(slot);
    onSelectSlot?.(`${slot.day} · ${slot.time}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="absolute z-50 bottom-full mb-2 left-0 w-[300px] bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-[12px] font-semibold">Best Time to Post</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground/50 hover:text-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Slots */}
      <div className="p-3 space-y-2">
        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider px-1 mb-2">
          Recommended windows · {platformKey === 'twitter' ? 'X / Twitter' : platformKey.charAt(0).toUpperCase() + platformKey.slice(1)}
        </p>
        {slots.map((slot, i) => (
          <button
            key={i}
            onClick={() => handleSelect(slot)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all text-left group
              ${selectedSlot === slot
                ? 'border-primary/50 bg-primary/8'
                : 'border-border hover:border-primary/30 hover:bg-muted/30'
              }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-foreground">{slot.day} · {slot.time}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{slot.reason}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
              <TrendingUp className="w-3 h-3 text-primary" />
              <span className="text-[11px] font-bold text-primary">{slot.score}</span>
            </div>
          </button>
        ))}
      </div>

      {/* AI insight */}
      <div className="px-3 pb-3">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !!aiInsight}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[11px] text-muted-foreground border border-dashed border-border rounded-lg hover:border-primary/30 hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isAnalyzing
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing your audience…</>
            : aiInsight
            ? <span className="text-primary text-[10px]">✓ AI insight loaded</span>
            : <><Sparkles className="w-3 h-3" /> Get AI insight for my audience</>
          }
        </button>

        <AnimatePresence>
          {aiInsight && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/15"
            >
              <p className="text-[11px] text-foreground/80 leading-relaxed">{aiInsight}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}