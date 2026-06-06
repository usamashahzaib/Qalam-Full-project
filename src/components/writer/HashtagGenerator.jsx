import React, { useState } from 'react';
import { Hash, Sparkles, Plus, Check } from 'lucide-react';
import { invokeLLM } from '@/api/ai';
import { toast } from 'sonner';
import { useApp } from '@/lib/AppContext';
import { PlanGateInline } from '@/components/ui/PlanGate';
import { canAccess } from '@/lib/planGating';

export default function HashtagGenerator({ content, platform, onAppend }) {
  const { plan } = useApp();
  const [hashtags, setHashtags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appended, setAppended] = useState(new Set());

  if (!canAccess(plan, 'hashtag_generator')) return <PlanGateInline feature="hashtag_generator" />;

  const generate = async () => {
    if (!content?.trim() || content.trim().length < 30) {
      toast.error('Write at least 30 characters first.');
      return;
    }
    setIsLoading(true);
    setHashtags([]);
    setAppended(new Set());

    try {
      const res = await invokeLLM({
        prompt: `Analyze this ${platform} post and suggest exactly 5 highly relevant hashtags. Mix 1-2 broad discovery tags and 3-4 niche community tags. No generic ones like #success or #motivation. Return ONLY a JSON object.

Post: """${content.slice(0, 1000)}"""

Return: { "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"] }`,
        response_json_schema: {
          type: 'object',
          properties: {
            hashtags: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['hashtags'],
        },
      });

      const tags = (res?.hashtags || []).map(t => t.startsWith('#') ? t : `#${t}`).slice(0, 5);
      setHashtags(tags);
    } catch {
      toast.error('Could not suggest hashtags. Check your API key.');
    }
    setIsLoading(false);
  };

  const handleAppend = (tag) => {
    onAppend(tag);
    setAppended(prev => new Set(prev).add(tag));
  };

  const handleAppendAll = () => {
    const remaining = hashtags.filter(t => !appended.has(t));
    if (!remaining.length) return;
    remaining.forEach(t => onAppend(t));
    setAppended(new Set(hashtags));
  };

  return (
    <div className="border-t border-border/50 px-4 py-3">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <Hash className="w-3 h-3 text-primary/70" />
          <span className="text-[10px] font-semibold text-foreground/80 uppercase tracking-wider">Hashtags</span>
        </div>
        <button
          onClick={generate}
          disabled={isLoading}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-3 h-3 border border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3 text-primary/70" />
          )}
          {hashtags.length > 0 ? 'Regenerate' : 'Suggest'}
        </button>
      </div>

      {hashtags.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {hashtags.map((tag) => {
              const done = appended.has(tag);
              return (
                <button
                  key={tag}
                  onClick={() => !done && handleAppend(tag)}
                  disabled={done}
                  title={done ? 'Added' : 'Click to append'}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-medium transition-all ${
                    done
                      ? 'bg-primary/10 border-primary/30 text-primary/60 cursor-default'
                      : 'bg-muted/30 border-border hover:border-primary/50 hover:bg-primary/5 hover:text-primary text-muted-foreground cursor-pointer'
                  }`}
                >
                  {done ? <Check className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
                  {tag}
                </button>
              );
            })}
          </div>

          {hashtags.some(t => !appended.has(t)) && (
            <button
              onClick={handleAppendAll}
              className="text-[10px] text-primary/70 hover:text-primary transition-colors font-medium"
            >
              + Add all
            </button>
          )}
        </div>
      )}

      {!hashtags.length && !isLoading && (
        <p className="text-[10px] text-muted-foreground/40 leading-relaxed">
          Suggest relevant hashtags based on your draft.
        </p>
      )}
    </div>
  );
}
