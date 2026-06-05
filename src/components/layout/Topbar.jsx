import React, { useState } from 'react';
import { Menu, Search } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useApp } from '@/lib/AppContext';
import { useNavigate } from 'react-router-dom';

export default function Topbar({ onMenuClick }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { posts } = useApp();
  const navigate = useNavigate();

  // Keyboard shortcut
  React.useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <header className="h-10 border-b border-border flex items-center justify-between px-4 lg:px-6 bg-background/95 backdrop-blur-sm sticky top-0 z-30 flex-shrink-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-muted-foreground hover:text-foreground transition-colors mr-3"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1 rounded border border-border/50 text-muted-foreground/60 text-[11px] hover:text-muted-foreground hover:border-border transition-all"
        >
          <Search className="w-3 h-3" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline text-[9px] px-1 py-0.5 rounded bg-muted font-mono opacity-50 ml-1">⌘K</kbd>
        </button>
      </header>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-md p-0 bg-card border-border overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Input
              autoFocus
              placeholder="Search posts, drafts, or navigate…"
              className="bg-transparent border-0 text-[13px] focus-visible:ring-0 px-0 h-auto py-0"
            />
          </div>
          <div className="p-2 max-h-[320px] overflow-y-auto">
            {posts.slice(0, 8).map((post) => (
              <button
                key={post.id}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-muted/40 transition-colors text-left group"
                onClick={() => { setSearchOpen(false); navigate('/library'); }}
              >
                <div className="min-w-0">
                  <p className="text-[13px] text-foreground truncate">{post.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{post.date}</p>
                </div>
                <span className={`text-[10px] ml-4 flex-shrink-0 ${post.status === 'scheduled' ? 'text-primary' : 'text-muted-foreground/50'}`}>
                  {post.status}
                </span>
              </button>
            ))}
            {posts.length === 0 && (
              <p className="text-[12px] text-muted-foreground text-center py-6">No posts yet.</p>
            )}
          </div>
          <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground/50">
            <span>↵ to open</span>
            <span>esc to close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}