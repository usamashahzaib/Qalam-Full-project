"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/providers/AuthProvider"
import { useWorkspace, type WorkspacePost } from "@/components/providers/WorkspaceProvider"
import { QalamLogo, QalamMark } from "@/components/QalamLogo"
import {
  GrowthIcon,
  ComposeIcon,
  CalendarIcon,
  AnalyticsIcon,
  VoiceIcon,
  LibraryIcon,
  CarouselIcon,
  MicroscopeIcon,
  TeamIcon,
  ProfileIcon,
  LinkedInIcon,
} from "@/components/ui/qalam-icons"
import { persistWriterIntent, withClientParam } from "@/lib/workspace-navigation"

const NAV_GROUPS = [
  {
    label: "Workspace",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: GrowthIcon },
      { href: "/chat", label: "AI Strategist", icon: VoiceIcon },
      { href: "/writer", label: "AI Writer", icon: ComposeIcon },
    ],
  },
  {
    label: "Publishing",
    links: [
      { href: "/calendar", label: "Planner", icon: CalendarIcon },
      { href: "/approvals", label: "Approvals", icon: AnalyticsIcon },
      { href: "/analytics", label: "Analytics", icon: GrowthIcon },
    ],
  },
  {
    label: "Intelligence",
    links: [
      { href: "/voice", label: "Voice Profile", icon: VoiceIcon },
      { href: "/library", label: "Library", icon: LibraryIcon },
      { href: "/carousels", label: "Carousels", icon: CarouselIcon },
      { href: "/competitors", label: "Research", icon: MicroscopeIcon },
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/agency", label: "Agency Hub", icon: TeamIcon },
      { href: "/settings", label: "Settings", icon: ProfileIcon },
    ],
  },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, logout } = useAuth()
  const workspace = useWorkspace()
  const activeClientId = searchParams.get("client")

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<WorkspacePost[]>([])
  const [searchFocused, setSearchFocused] = useState(false)
  const [clients, setClients] = useState<Array<{ id: string; client_name: string }>>([])
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const switcherRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    let active = true
    fetch("/api/agency/clients")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return
        setClients(Array.isArray(data.clients) ? data.clients : [])
      })
      .catch(() => {
        if (!active) return
        setClients([])
      })
    return () => {
      active = false
    }
  }, [user])

  const activeClientName = useMemo(() => {
    if (!activeClientId) return "Personal Workspace"
    const matched = clients.find((client) => client.id === activeClientId)
    return matched ? `${matched.client_name}'s Workspace` : "Client Workspace"
  }, [activeClientId, clients])

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false)
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) setSwitcherOpen(false)
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      setSearchResults([])
      return
    }
    setSearchResults(
      workspace.state.posts
        .filter((post) => [post.title, post.content, post.type].some((value) => String(value).toLowerCase().includes(query)))
        .slice(0, 5)
    )
  }, [searchQuery, workspace.state.posts])

  const handleOpenPost = (post: WorkspacePost) => {
    persistWriterIntent(post, /^\d{4}-\d{2}-\d{2}$/.test(post.date) ? post.date : null)
    setSearchQuery("")
    setSearchFocused(false)
    router.push(withClientParam("/writer", activeClientId))
  }

  const handleSwitchWorkspace = (clientId: string | null) => {
    setSwitcherOpen(false)
    const url = new URL(window.location.href)
    if (clientId) url.searchParams.set("client", clientId)
    else url.searchParams.delete("client")
    router.push(url.pathname + url.search)
  }

  const handleCreatePost = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("writerLoad")
      sessionStorage.removeItem("writerScheduleDate")
    }
    router.push(withClientParam("/writer?compose=new", activeClientId))
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-jakarta">
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-64 flex-col overflow-hidden border-r border-zinc-800 bg-zinc-900 text-zinc-300">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-16 shrink-0 items-center border-b border-zinc-800 px-6">
            <QalamLogo href={withClientParam("/dashboard", activeClientId)} size={28} textClassName="text-lg font-extrabold text-white" containerClassName="flex items-center gap-2" />
          </div>

          <div className="px-4 py-4" ref={switcherRef}>
            <button onClick={() => setSwitcherOpen((value) => !value)} className={`w-full cursor-pointer flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl border transition-all text-left group ${switcherOpen ? "bg-zinc-800 border-zinc-600 shadow-lg shadow-black/20" : "bg-zinc-900/60 hover:bg-zinc-800 border-zinc-700/70"}`}>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-teal-100/70">Active Workspace</p>
                <p className="text-sm font-semibold text-white truncate mt-1">{activeClientName}</p>
              </div>
              <svg className={`h-4 w-4 shrink-0 text-zinc-400 group-hover:text-white transition-transform duration-200 ${switcherOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {switcherOpen && (
              <div className="absolute left-4 right-4 mt-2 bg-zinc-800 border border-zinc-700 rounded-2xl shadow-2xl z-40 overflow-hidden divide-y divide-zinc-700 max-h-72 overflow-y-auto">
                <button onClick={() => handleSwitchWorkspace(null)} className={`w-full cursor-pointer text-left px-4 py-3 text-sm transition-colors hover:bg-zinc-700 ${!activeClientId ? "bg-teal/10 text-white font-semibold" : "text-zinc-300"}`}>Personal Workspace</button>
                {clients.map((client) => <button key={client.id} onClick={() => handleSwitchWorkspace(client.id)} className={`w-full cursor-pointer text-left px-4 py-3 text-sm transition-colors hover:bg-zinc-700 ${activeClientId === client.id ? "bg-teal/10 text-white font-semibold" : "text-zinc-300"}`}>{client.client_name}</button>)}
                <Link href={withClientParam("/agency", activeClientId)} onClick={() => setSwitcherOpen(false)} className="flex items-center gap-2 px-4 py-3 text-xs text-gold font-semibold hover:bg-zinc-700"><TeamIcon className="h-3.5 w-3.5" />Manage client list {">"}</Link>
              </div>
            )}
          </div>

          <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1 px-3 text-[9px] font-bold uppercase tracking-widest text-zinc-600">{group.label}</p>
                <div className="space-y-0.5">
                  {group.links.map((link) => {
                    const Icon = link.icon
                    const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href + "/"))
                    return (
                      <Link key={link.href} href={withClientParam(link.href, activeClientId)} className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all group ${active ? "bg-teal/90 text-white shadow-sm shadow-teal/20" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}>
                        <Icon className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-gold" : "text-zinc-600 group-hover:text-zinc-300"}`} />
                        <span className={active ? "font-semibold" : ""}>{link.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="shrink-0 space-y-3 border-t border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700 text-white font-bold overflow-hidden">
              {user?.imageUrl ? <img src={user.imageUrl} alt={user.fullName} className="h-full w-full object-cover" /> : user?.fullName.charAt(0)}
              {user?.linkedinMemberId && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#0A66C2] border-2 border-zinc-900 flex items-center justify-center"><LinkedInIcon className="h-1.5 w-1.5 text-white" /></span>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5"><p className="text-sm font-bold text-white truncate leading-none">{user?.fullName}</p><span className="shrink-0 rounded-full bg-gold/10 px-1.5 py-0.5 text-[9px] font-bold text-gold uppercase tracking-wider">{workspace.state.billing.plan}</span></div>
              <p className="text-xs text-zinc-500 truncate mt-1">{user?.email}</p>
            </div>
          </div>

          <button onClick={logout} className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-800/40 hover:bg-zinc-800 px-4 py-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors">Sign out</button>
        </div>
      </aside>

      <header className="hidden md:flex h-16 border-b border-zinc-100 bg-white/90 backdrop-blur-sm fixed top-0 right-0 left-64 z-20 items-center justify-between px-8 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div className="relative w-80" ref={searchRef}>
          <div className="relative flex items-center">
            <svg className="absolute left-3.5 h-4 w-4 text-zinc-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Search posts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setSearchFocused(true)} className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 pl-10 pr-4 py-2 text-sm text-zinc-900 outline-none focus:bg-white focus:border-teal/50 focus:ring-4 focus:ring-teal/10 transition-all" />
          </div>
          {searchFocused && searchQuery.trim() && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-40 overflow-hidden divide-y divide-zinc-100">
              <div className="px-4 py-2 bg-zinc-50/50 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Search Results ({searchResults.length})</div>
              {searchResults.length === 0 ? <div className="px-4 py-6 text-center text-xs text-zinc-500 font-medium">No matching posts found.</div> : searchResults.map((post) => <button key={post.id} onClick={() => handleOpenPost(post)} className="w-full cursor-pointer flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-zinc-50 transition-colors group"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${post.status === "published" ? "bg-emerald-50 text-emerald-700" : post.status === "scheduled" ? "bg-amber-50 text-amber-700" : "bg-zinc-100 text-zinc-600"}`}>{post.status}</span><span className="text-[10px] text-zinc-400 font-medium truncate">{post.type}</span></div><p className="text-xs font-semibold text-zinc-900 group-hover:text-teal truncate mt-1">{post.title}</p></div><svg className="h-4 w-4 text-zinc-400 group-hover:text-teal opacity-0 group-hover:opacity-100 transition-all shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user?.linkedinMemberId ? (
            <div className="flex items-center gap-2 rounded-full border border-zinc-200/80 bg-zinc-50/50 pl-2 pr-3 py-1 text-xs"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0A66C2] text-white"><LinkedInIcon className="h-2.5 w-2.5" /></span><span className="font-semibold text-zinc-600">LinkedIn Connected</span></div>
          ) : (
            <Link href={withClientParam("/settings", activeClientId)} className="flex items-center gap-2 rounded-full border border-dashed border-zinc-300 hover:border-zinc-400 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors"><LinkedInIcon className="h-3 w-3 text-zinc-400" />Connect LinkedIn</Link>
          )}
          <button onClick={handleCreatePost} className="cursor-pointer rounded-xl bg-teal px-4 py-2 text-xs font-bold text-white hover:bg-teal-600 transition-colors shadow-sm shadow-teal/10">Create Post</button>
        </div>
      </header>

      <header className="flex md:hidden h-14 border-b border-zinc-200 bg-white/90 backdrop-blur fixed top-0 inset-x-0 z-30 items-center justify-between px-4">
        <div className="flex items-center gap-2"><QalamMark size={28} /><span className="text-sm font-extrabold text-zinc-900 tracking-tight">Qalam</span></div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-teal/5 border border-teal/10 px-2.5 py-0.5 text-[10px] font-bold text-teal max-w-[120px] truncate">{activeClientId ? clients.find((client) => client.id === activeClientId)?.client_name || "Client" : "Personal"}</span>
          <button onClick={() => setSearchFocused((value) => !value)} className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors" aria-label="Toggle mobile search"><svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></button>
          <button onClick={() => setSwitcherOpen((value) => !value)} className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors" aria-label="Toggle workspace switcher"><svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg></button>
        </div>

        {searchFocused && (
          <div className="absolute top-14 left-0 right-0 bg-white border-b border-zinc-200 px-4 py-3 shadow-lg z-40 animate-fade-in" ref={searchRef}>
            <div className="relative flex items-center">
              <input type="text" placeholder="Search posts and drafts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-4 pr-16 py-2 text-xs text-zinc-900 outline-none focus:bg-white focus:border-teal/50 transition-all" />
              <button onClick={() => { setSearchFocused(false); setSearchQuery("") }} className="absolute right-3 text-xs text-zinc-400 font-bold hover:text-zinc-600">Close</button>
            </div>
            {searchQuery.trim() && <div className="mt-2 bg-white rounded-xl border border-zinc-100 overflow-hidden divide-y divide-zinc-50 max-h-60 overflow-y-auto">{searchResults.length === 0 ? <div className="px-4 py-4 text-center text-xs text-zinc-500">No results found.</div> : searchResults.map((post) => <button key={post.id} onClick={() => handleOpenPost(post)} className="w-full cursor-pointer flex items-center justify-between gap-4 px-3 py-2.5 text-left hover:bg-zinc-50 transition-colors"><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-zinc-900 truncate">{post.title}</p><p className="text-[10px] text-zinc-400 font-medium truncate">{post.status} - {post.type}</p></div></button>)}</div>}
          </div>
        )}

        {switcherOpen && (
          <div className="absolute top-14 right-4 w-56 bg-white border border-zinc-200 rounded-xl shadow-xl z-40 overflow-hidden divide-y divide-zinc-100 animate-scale-in" ref={switcherRef}>
            <div className="px-4 py-2 bg-zinc-50/50 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active Workspace</div>
            <button onClick={() => handleSwitchWorkspace(null)} className={`w-full cursor-pointer text-left px-4 py-2.5 text-xs transition-colors hover:bg-zinc-50 ${!activeClientId ? "bg-teal/5 text-teal font-bold" : "text-zinc-700"}`}>Personal Workspace</button>
            {clients.map((client) => <button key={client.id} onClick={() => handleSwitchWorkspace(client.id)} className={`w-full cursor-pointer text-left px-4 py-2.5 text-xs transition-colors hover:bg-zinc-50 ${activeClientId === client.id ? "bg-teal/5 text-teal font-bold" : "text-zinc-700"}`}>{client.client_name}</button>)}
          </div>
        )}
      </header>

      <main className="qalam-app-canvas pl-0 md:pl-64 pt-14 md:pt-16 pb-20 md:pb-8"><div className="relative z-10 animate-fade-in">{children}</div></main>
    </div>
  )
}
