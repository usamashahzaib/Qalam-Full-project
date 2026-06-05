import React from 'react';
import { ThumbsUp, MessageSquare, Repeat2, Send, Heart, Bookmark, BarChart2 } from 'lucide-react';

function getInitials(name) {
  return (name || 'AK').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// ─── LinkedIn ────────────────────────────────────────────────────────────────
export function LinkedInPreview({ content, authorName, authorTitle }) {
  const preview = content.length > 280 ? content.slice(0, 280) : content;
  const hasMore = content.length > 280;
  const initials = getInitials(authorName);

  return (
    <div className="rounded-lg overflow-hidden border border-white/5 bg-[#1B1F23] text-white text-left">
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="w-10 h-10 rounded-full bg-[#073F3A] border border-yellow-600/20 flex items-center justify-center text-[11px] font-semibold text-yellow-500 flex-shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-white leading-none">{authorName}</p>
          <p className="text-[11px] text-[#8B9097] mt-1 leading-none">{authorTitle}</p>
          <p className="text-[10px] text-[#5A6068] mt-1">Just now · 🌐</p>
        </div>
      </div>
      <div className="px-4 pb-4 text-[13px] text-[#E7E9EA] leading-[1.7] whitespace-pre-wrap min-h-[64px]">
        {content ? (
          <>
            {preview}
            {hasMore && <span className="text-[#70B5F9] cursor-pointer"> …see more</span>}
          </>
        ) : (
          <span className="text-[#5A6068] italic text-[12px]">Your post appears here as you write…</span>
        )}
      </div>
      {content.length > 0 && (
        <div className="border-t border-white/5">
          <div className="flex items-center justify-between px-4 py-1.5 text-[11px] text-[#5A6068]">
            <span>👍 ❤️ 💡 47</span>
            <span>12 comments · 3 reposts</span>
          </div>
          <div className="flex border-t border-white/5">
            {[
              { icon: ThumbsUp, label: 'Like' },
              { icon: MessageSquare, label: 'Comment' },
              { icon: Repeat2, label: 'Repost' },
              { icon: Send, label: 'Send' },
            ].map(({ icon: Icon, label }) => (
              <button key={label} className="flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] text-[#8B9097] hover:text-white hover:bg-white/5 transition-colors">
                <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Twitter/X ───────────────────────────────────────────────────────────────
export function TwitterPreview({ content, authorName }) {
  const isThread = content.includes('1/') || content.includes('1.');
  const tweets = isThread
    ? content.split(/\n\n(?=\d+[/.])/g).filter(Boolean)
    : [content];
  const initials = getInitials(authorName);

  return (
    <div className="rounded-lg overflow-hidden border border-white/8 bg-[#000000] text-white text-left">
      {tweets.map((tweet, i) => (
        <div key={i} className={`p-4 ${i < tweets.length - 1 ? 'border-b border-white/8' : ''}`}>
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1D9BF0]/20 border border-[#1D9BF0]/20 flex items-center justify-center text-[10px] font-bold text-[#1D9BF0] flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[13px] font-bold text-white">{authorName}</span>
                <span className="text-[12px] text-[#71767B]">· Just now</span>
              </div>
              {tweet ? (
                <p className="text-[14px] text-[#E7E9EA] leading-[1.6] whitespace-pre-wrap">
                  {tweet.length > 280 ? tweet.slice(0, 280) : tweet}
                  {tweet.length > 280 && <span className="text-[#F4212E] text-[11px]"> +{tweet.length - 280} over limit</span>}
                </p>
              ) : (
                <p className="text-[#5B7083] italic text-[13px]">Your tweet appears here…</p>
              )}
              {content.length > 0 && (
                <div className="flex items-center gap-5 mt-3 text-[#71767B]">
                  {[
                    { icon: MessageSquare, count: '4' },
                    { icon: Repeat2, count: '12' },
                    { icon: Heart, count: '87' },
                    { icon: BarChart2, count: '2.1K' },
                    { icon: Bookmark, count: '' },
                  ].map(({ icon: Icon, count }, j) => (
                    <button key={j} className="flex items-center gap-1 hover:text-[#1D9BF0] transition-colors">
                      <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {count && <span className="text-[11px]">{count}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Threads ─────────────────────────────────────────────────────────────────
export function ThreadsPreview({ content, authorName }) {
  const preview = content.length > 500 ? content.slice(0, 500) : content;
  const hasMore = content.length > 500;
  const initials = getInitials(authorName);

  return (
    <div className="rounded-lg overflow-hidden border border-white/6 bg-[#101010] text-white text-left">
      <div className="p-4">
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-[#222] border border-white/10 flex items-center justify-center text-[10px] font-semibold text-white/80 flex-shrink-0">
              {initials}
            </div>
            {content.length > 0 && <div className="w-px flex-1 bg-white/10 mt-2 mb-1 min-h-[20px]" />}
          </div>
          <div className="flex-1 min-w-0 pb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[13px] font-semibold text-white">{authorName}</span>
              <span className="text-[11px] text-[#777]">Just now</span>
            </div>
            {content ? (
              <p className="text-[14px] text-[#E0E0E0] leading-[1.65] whitespace-pre-wrap">
                {preview}
                {hasMore && <span className="text-[#888]"> …more</span>}
              </p>
            ) : (
              <p className="text-[#555] italic text-[13px]">Your post appears here…</p>
            )}
            {content.length > 0 && (
              <div className="flex items-center gap-4 mt-3 text-[#555]">
                {[Heart, MessageSquare, Repeat2, Send].map((Icon, i) => (
                  <button key={i} className="hover:text-[#aaa] transition-colors">
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Reply stub */}
        {content.length > 0 && (
          <div className="flex gap-3 mt-1">
            <div className="w-6 h-6 rounded-full bg-[#1a1a1a] border border-white/5 flex-shrink-0" />
            <p className="text-[12px] text-[#555] pt-1">Reply to {authorName}…</p>
          </div>
        )}
      </div>
      {content.length > 0 && (
        <div className="border-t border-white/5 flex items-center justify-between px-4 py-2.5 text-[11px] text-[#555]">
          <span>47 likes · 8 replies</span>
        </div>
      )}
    </div>
  );
}