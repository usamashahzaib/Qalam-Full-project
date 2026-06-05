import React, { useState, useMemo } from 'react';
import { Search, MoreHorizontal, PenLine, Copy, Trash2, ArrowRight, RotateCcw, TrendingUp, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/lib/AppContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS = {
  published: { label: 'Published', color: 'text-foreground/60' },
  scheduled:  { label: 'Scheduled',  color: 'text-primary' },
  draft:      { label: 'Draft',      color: 'text-muted-foreground/50' },
};

const PLATFORM_DOT = {
  linkedin: 'bg-blue-500',
  twitter: 'bg-zinc-400',
  threads: 'bg-stone-500',
};

const TABS = ['All', 'Published', 'Scheduled', 'Drafts'];
const SORT_OPTIONS = ['Newest', 'Oldest', 'Top engagement'];
const PLATFORM_FILTERS = ['All platforms', 'LinkedIn', 'X / Twitter', 'Threads'];

const getPlatformFromType = (type = '') => {
  if (type.toLowerCase().includes('linkedin')) return 'linkedin';
  if (type.toLowerCase().includes('x') || type.toLowerCase().includes('twitter')) return 'twitter';
  if (type.toLowerCase().includes('threads')) return 'threads';
  return null;
};

const parseEngagement = (e) => {
  if (!e || e === '—') return 0;
  return parseFloat(e.replace('%', '')) || 0;
};

export default function Library() {
  const { posts, deletePost, saveDraft } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('All');
  const [sort, setSort] = useState('Newest');
  const [platformFilter, setPlatformFilter] = useState('All platforms');
  const [viewPost, setViewPost] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const tabKey = tab === 'All' ? null : tab === 'Drafts' ? 'draft' : tab.toLowerCase();

  const filtered = useMemo(() => {
    let list = posts.filter(p => {
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.content || '').toLowerCase().includes(search.toLowerCase());
      const matchTab = !tabKey || p.status === tabKey;
      const pf = platformFilter === 'All platforms' ? null
        : platformFilter === 'LinkedIn' ? 'linkedin'
        : platformFilter === 'X / Twitter' ? 'twitter'
        : 'threads';
      const matchPlatform = !pf || getPlatformFromType(p.type) === pf;
      return matchSearch && matchTab && matchPlatform;
    });

    if (sort === 'Oldest') list = [...list].reverse();
    if (sort === 'Top engagement') list = [...list].sort((a, b) => parseEngagement(b.engagement) - parseEngagement(a.engagement));
    return list;
  }, [posts, search, tabKey, sort, platformFilter]);

  const counts = {
    All: posts.length,
    Published: posts.filter(p => p.status === 'published').length,
    Scheduled: posts.filter(p => p.status === 'scheduled').length,
    Drafts: posts.filter(p => p.status === 'draft').length,
  };

  const handleCopy = (post) => {
    navigator.clipboard.writeText(post.content || post.title);
    toast.success('Copied to clipboard');
  };

  const handleRecycle = (post) => {
    // Save as new draft with recycled content
    saveDraft(`[Recycled] ${post.title}`, post.content || '', post.type);
    toast.success('Post recycled', { description: 'Saved as a new draft in your library.' });
  };

  const handleLoadInWriter = (post) => {
    // Store in sessionStorage so Writer can pick it up
    sessionStorage.setItem('writerLoad', JSON.stringify({ title: post.title, content: post.content || '', type: post.type }));
    navigate('/writer');
  };

  const topPosts = useMemo(() =>
    [...posts]
      .filter(p => p.status === 'published' && parseEngagement(p.engagement) > 0)
      .sort((a, b) => parseEngagement(b.engagement) - parseEngagement(a.engagement))
      .slice(0, 3),
    [posts]
  );

  return (
    <div className="min-h-full px-6 py-10 sm:px-10 lg:px-14 lg:py-14 max-w-[960px] mx-auto">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>

        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase font-medium mb-4">Post Library</p>
            <h1 className="font-serif text-[32px] font-medium tracking-tight leading-none">
              {posts.length} posts
            </h1>
          </div>
          <Link
            to="/writer"
            className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <PenLine className="w-3.5 h-3.5" strokeWidth={1.5} />
            New post
          </Link>
        </div>

        {/* Top performers banner */}
        {topPosts.length > 0 && (
          <div className="mb-8 border border-primary/20 rounded-xl bg-primary/5 px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <p className="text-[10px] tracking-[0.15em] text-primary uppercase font-semibold">Top Performers — Click to recycle</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {topPosts.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleLoadInWriter(p)}
                  className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg hover:border-primary/40 transition-colors text-left group"
                >
                  <RotateCcw className="w-3 h-3 text-primary group-hover:rotate-180 transition-transform duration-500" />
                  <span className="text-[11px] text-foreground truncate max-w-[200px]">{p.title}</span>
                  <span className="text-[10px] text-primary font-semibold ml-1">{p.engagement}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative w-full sm:max-w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search posts…"
                className="pl-9 bg-muted border-0 text-[13px] h-9 placeholder:text-muted-foreground/30"
              />
            </div>

            <div className="flex items-center gap-1">
              {TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 text-[12px] rounded-md transition-colors ${
                    tab === t ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t}
                  {counts[t] > 0 && (
                    <span className={`ml-1.5 text-[10px] tabular-nums ${tab === t ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
                      {counts[t]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-md transition-colors ml-auto ${
                showFilters || platformFilter !== 'All platforms' || sort !== 'Newest'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Filter className="w-3 h-3" /> Filters
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-3 pt-1">
                  <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
                    {PLATFORM_FILTERS.map(f => (
                      <button key={f} onClick={() => setPlatformFilter(f)}
                        className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${platformFilter === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      >{f}</button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
                    {SORT_OPTIONS.map(s => (
                      <button key={s} onClick={() => setSort(s)}
                        className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${sort === s ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      >{s}</button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="border border-border border-dashed rounded-lg px-8 py-16 text-center">
            <p className="text-[13px] text-muted-foreground mb-4">
              {search ? `No posts matching "${search}".` : 'Nothing in this view yet.'}
            </p>
            <Link to="/writer" className="inline-flex items-center gap-1.5 text-[12px] text-primary hover:underline underline-offset-4">
              <PenLine className="w-3 h-3" /> Write a post
            </Link>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-5 py-3 text-[10px] text-muted-foreground/60 font-medium tracking-[0.12em] uppercase">Title</th>
                  <th className="text-left px-5 py-3 text-[10px] text-muted-foreground/60 font-medium tracking-[0.12em] uppercase hidden sm:table-cell">Date</th>
                  <th className="text-left px-5 py-3 text-[10px] text-muted-foreground/60 font-medium tracking-[0.12em] uppercase">Status</th>
                  <th className="text-right px-5 py-3 text-[10px] text-muted-foreground/60 font-medium tracking-[0.12em] uppercase hidden lg:table-cell">Engagement</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((post) => {
                  const platform = getPlatformFromType(post.type);
                  const eng = parseEngagement(post.engagement);
                  return (
                    <tr
                      key={post.id}
                      className="hover:bg-muted/15 transition-colors cursor-pointer"
                      onClick={() => post.content && setViewPost(post)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 min-w-0">
                          {platform && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PLATFORM_DOT[platform]}`} />}
                          <p className="text-[13px] text-foreground font-medium truncate max-w-[240px]">{post.title}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground/50 mt-0.5 pl-3.5">{post.type}</p>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <p className="text-[12px] text-muted-foreground/60 whitespace-nowrap">
                          {post.scheduledTime ? `${post.date} · ${post.scheduledTime}` : post.date}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] tracking-[0.1em] uppercase font-semibold ${STATUS[post.status]?.color}`}>
                          {STATUS[post.status]?.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right hidden lg:table-cell">
                        <span className={`text-[12px] tabular-nums font-medium ${eng >= 5 ? 'text-primary' : eng >= 3 ? 'text-foreground/70' : 'text-muted-foreground/50'}`}>
                          {post.engagement}
                        </span>
                      </td>
                      <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-muted-foreground/40 hover:text-foreground transition-colors p-1 rounded">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem className="text-[12px]" onClick={() => handleLoadInWriter(post)}>
                              <RotateCcw className="w-3 h-3 mr-2" /> Load in Writer
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-[12px]" onClick={() => handleRecycle(post)}>
                              <PenLine className="w-3 h-3 mr-2" /> Recycle as draft
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-[12px]" onClick={() => handleCopy(post)}>
                              <Copy className="w-3 h-3 mr-2" /> Copy text
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-[12px] text-destructive" onClick={() => deletePost(post.id)}>
                              <Trash2 className="w-3 h-3 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </motion.div>

      {/* Post reader */}
      <Dialog open={!!viewPost} onOpenChange={() => setViewPost(null)}>
        <DialogContent className="bg-card border-border max-w-[540px] max-h-[80vh] overflow-hidden flex flex-col p-0">
          <div className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <DialogTitle className="text-[13px] font-semibold leading-snug pr-6">{viewPost?.title}</DialogTitle>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {viewPost?.date}{viewPost?.scheduledTime ? ` · ${viewPost.scheduledTime}` : ''}
              {' · '}
              <span className={STATUS[viewPost?.status]?.color}>{STATUS[viewPost?.status]?.label}</span>
              {viewPost?.engagement && viewPost.engagement !== '—' && (
                <span className="text-primary font-semibold ml-2">{viewPost.engagement} eng.</span>
              )}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <p className="text-[14px] text-foreground/85 leading-[1.85] whitespace-pre-wrap">
              {viewPost?.content || <span className="text-muted-foreground/40 italic">No content stored for this post.</span>}
            </p>
          </div>
          <div className="flex gap-2 px-6 py-4 border-t border-border flex-shrink-0">
            <button
              className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors"
              onClick={() => { handleCopy(viewPost); }}
            >
              <Copy className="w-3 h-3" /> Copy
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors"
              onClick={() => { handleRecycle(viewPost); setViewPost(null); }}
            >
              <RotateCcw className="w-3 h-3" /> Recycle
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-2 text-[12px] bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors ml-auto"
              onClick={() => { setViewPost(null); handleLoadInWriter(viewPost); }}
            >
              <PenLine className="w-3 h-3" /> Load in Writer
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}