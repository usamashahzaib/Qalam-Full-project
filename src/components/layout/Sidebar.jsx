import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, PenLine, Calendar, BookOpen,
  BarChart3, Fingerprint, Users, Settings, X, Radar
} from 'lucide-react';
import { useApp } from '@/lib/AppContext';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Writer', icon: PenLine, path: '/writer' },
  { label: 'Calendar', icon: Calendar, path: '/calendar' },
  { label: 'Library', icon: BookOpen, path: '/library' },
  { label: 'Analytics', icon: BarChart3, path: '/analytics' },
  { label: 'Competitors', icon: Radar, path: '/competitors' },
  { label: 'Voice DNA', icon: Fingerprint, path: '/voice' },
  { label: 'Agency', icon: Users, path: '/agency' },
];

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { posts, profile } = useApp();
  const scheduled = posts.filter(p => p.status === 'scheduled').length;
  const drafts = posts.filter(p => p.status === 'draft').length;

  const handleSignOut = () => {
    window.location.assign('/');
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-[hsl(164_81%_12%_/_0.35)] z-40 lg:hidden backdrop-blur-[2px]" onClick={onClose} />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-[196px]
          bg-sidebar border-r border-sidebar-border
          flex flex-col
          transition-transform duration-200 ease-out
          lg:translate-x-0 lg:relative lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-sidebar-border flex-shrink-0">
          <Link to="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="w-[22px] h-[22px] flex-shrink-0">
              <img
                src="/byqalam-mark-gold.png"
                alt="Qalam"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-serif text-[14px] font-semibold tracking-tight text-foreground">
              Qalam
            </span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 pt-4 pb-2 overflow-y-auto">
          <div className="space-y-px">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              const badge = item.path === '/calendar' && scheduled > 0 ? scheduled
                : item.path === '/library' && drafts > 0 ? drafts
                : null;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`
                    flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[12px]
                    transition-colors duration-100
                    ${active
                      ? 'bg-accent/60 text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
                    }
                  `}
                >
                  <item.icon
                    className={`w-[14px] h-[14px] flex-shrink-0 ${active ? 'text-foreground' : 'text-muted-foreground/70'}`}
                    strokeWidth={active ? 1.75 : 1.5}
                  />
                  <span className="flex-1">{item.label}</span>
                  {badge && (
                    <span className="text-[9px] font-semibold tabular-nums text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                      {badge}
                    </span>
                  )}
                  {active && !badge && (
                    <div className="w-1 h-1 rounded-full bg-primary/60 flex-shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="px-2 pb-3 border-t border-sidebar-border pt-2 flex-shrink-0">
          <Link
            to="/settings"
            onClick={onClose}
            className={`
              flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[12px] transition-colors
              ${location.pathname === '/settings'
                ? 'bg-accent/60 text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
              }
            `}
          >
            <Settings className="w-[14px] h-[14px] flex-shrink-0 text-muted-foreground/70" strokeWidth={1.5} />
            <span>Settings</span>
          </Link>

          {/* Usage bar */}
          <div className="px-3 mt-3 mb-2">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
              <span>12 / 30 posts</span>
              <span className="text-primary/70">40%</span>
            </div>
            <div className="h-[1.5px] bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary/40 rounded-full" style={{ width: '40%' }} />
            </div>
          </div>

          {/* User */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 mt-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors text-left"
          >
            <div className="w-5 h-5 rounded-full bg-accent border border-primary/20 flex items-center justify-center text-[9px] font-semibold text-primary flex-shrink-0">
              {(profile?.name || 'AK').split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-foreground truncate">{profile?.name || 'Alex Kim'}</p>
              <p className="text-[9px] text-muted-foreground/60">Sign out</p>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}
