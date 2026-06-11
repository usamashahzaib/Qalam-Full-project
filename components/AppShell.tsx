"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
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
import { hasFeatureAccess, type PlanTier } from "@/lib/entitlements"
import { UpgradeModal } from "@/components/UpgradeModal"

const NAV_GROUPS = [
  {
    label: "Workspace",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: GrowthIcon },
      { href: "/chat", label: "AI Strategist", icon: VoiceIcon, requiredPlan: "Pro" as PlanTier },
      { href: "/writer", label: "AI Writer", icon: ComposeIcon },
    ],
  },
  {
    label: "Publishing",
    links: [
      { href: "/calendar", label: "Planner", icon: CalendarIcon, requiredPlan: "Solo" as PlanTier },
      { href: "/approvals", label: "Approvals", icon: AnalyticsIcon, requiredPlan: "Pro" as PlanTier },
      { href: "/analytics", label: "Analytics", icon: GrowthIcon, requiredPlan: "Solo" as PlanTier },
    ],
  },
  {
    label: "Intelligence",
    links: [
      { href: "/voice", label: "Voice Profile", icon: VoiceIcon, requiredPlan: "Solo" as PlanTier },
      { href: "/library", label: "Library", icon: LibraryIcon, requiredPlan: "Solo" as PlanTier },
      { href: "/carousels", label: "Carousels", icon: CarouselIcon },
      { href: "/competitors", label: "Research", icon: MicroscopeIcon, requiredPlan: "Pro" as PlanTier },
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/agency", label: "Agency Hub", icon: TeamIcon, requiredPlan: "Agency" as PlanTier },
      { href: "/settings", label: "Settings", icon: ProfileIcon },
    ],
  },
]

const sidebarSectionStateKey = "qalam-sidebar-sections"
const defaultSectionState = () => Object.fromEntries(NAV_GROUPS.map((group) => [group.label, true]))

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const workspace = useWorkspace()
  const activeClientId = searchParams.get("client")
  const linkedinConnected = (session?.user as { provider?: string } | undefined)?.provider === "linkedin"
  const user = session?.user
    ? {
        email: session.user.email || "",
        fullName: session.user.name || session.user.email || "User",
        firstName: (session.user.name || session.user.email || "User").split(" ")[0],
        imageUrl: session.user.image || null,
        role: "user",
        linkedinMemberId: linkedinConnected ? session.user.email : null,
      }
    : null

  const [searchQuery, setSearchQuery] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)
  const [clients, setClients] = useState<Array<{ id: string; client_name: string }>>([])
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [upgradePrompt, setUpgradePrompt] = useState<{ plan: PlanTier; reason: string } | null>(null)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return defaultSectionState()
    try {
      return { ...defaultSectionState(), ...JSON.parse(localStorage.getItem(sidebarSectionStateKey) || "{}") }
    } catch {
      return defaultSectionState()
    }
  })
  const searchRef = useRef<HTMLDivElement>(null)
  const switcherRef = useRef<HTMLDivElement>(null)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const currentPlan = workspace.state.billing.plan
  const hasAgencyAccess = currentPlan.startsWith("Agency")
  const canAddWorkspace = hasAgencyAccess

  useEffect(() => {
    if (!user) return
    let active = true
    fetch("/api/agency/clients")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return
        const seen = new Set<string>()
        setClients(Array.isArray(data.clients) ? data.clients.filter((client: { id?: string; client_name?: string }) => {
          const name = client.client_name?.trim()
          const key = name?.toLowerCase()
          if (!name || name === "Personal Workspace" || !key || seen.has(key)) return false
          seen.add(key)
          return true
        }) : [])
      })
      .catch(() => {
        if (!active) return
        setClients([])
      })
    return () => {
      active = false
    }
  }, [user])

  const clientWorkspaces = useMemo(() => clients.filter((client, index, list) => {
    const name = client.client_name.trim()
    return name !== "Personal Workspace" && list.findIndex((item) => item.id === client.id || item.client_name.trim().toLowerCase() === name.toLowerCase()) === index
  }), [clients])
  const showManageClientList = hasAgencyAccess && clientWorkspaces.length > 0

  const activeClientName = useMemo(() => {
    if (!activeClientId) return "Personal Workspace"
    const matched = clientWorkspaces.find((client) => client.id === activeClientId)
    return matched ? `${matched.client_name}'s Workspace` : "Client Workspace"
  }, [activeClientId, clientWorkspaces])

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false)
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) setSwitcherOpen(false)
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) setUserDropdownOpen(false)
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  useEffect(() => {
    localStorage.setItem(sidebarSectionStateKey, JSON.stringify(openSections))
  }, [openSections])

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return []
    return workspace.state.posts
      .filter((post) => [post.title, post.content, post.type].some((value) => String(value).toLowerCase().includes(query)))
      .slice(0, 5)
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

  const handleAddWorkspace = () => {
    setSwitcherOpen(false)
    if (!canAddWorkspace) return
    router.push(withClientParam("/agency", activeClientId))
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
              <div className="qalam-scrollbar-dark absolute left-4 right-4 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-800 shadow-2xl z-40 overflow-hidden divide-y divide-zinc-700">
                <div className="bg-teal/10 px-4 py-3 text-sm font-semibold text-white">{activeClientName}</div>
                <div>
                  {showManageClientList ? <Link href={withClientParam("/agency", activeClientId)} onClick={() => setSwitcherOpen(false)} className="flex items-center gap-2 px-4 py-3 text-xs font-semibold text-gold hover:bg-zinc-700"><TeamIcon className="h-3.5 w-3.5" />Manage client list &gt;</Link> : null}
                  {canAddWorkspace ? (
                    <button onClick={handleAddWorkspace} className="w-full cursor-pointer px-4 py-3 text-left text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-700">Add workspace</button>
                  ) : (
                    <div className="px-3 py-2 text-xs text-zinc-500">
                      Add workspace - <a href="/pricing?plan=Agency" className="text-teal-600 hover:underline">Unlock in Agency</a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <nav className="qalam-scrollbar-dark min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <button
                  onClick={() => toggleSection(group.label)}
                  className="mb-1 flex w-full cursor-pointer items-center justify-between px-3 text-left text-[9px] font-bold uppercase tracking-widest text-zinc-600 transition-colors hover:text-zinc-400"
                  aria-expanded={openSections[group.label] ?? true}
                >
                  <span>{group.label}</span>
                  <svg className={`h-3 w-3 transition-transform ${(openSections[group.label] ?? true) ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {(openSections[group.label] ?? true) ? <div className="space-y-0.5">
                  {group.links.map((link) => {
                    const Icon = link.icon
                    const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href + "/"))
                    const isLocked = link.requiredPlan && !hasFeatureAccess(currentPlan, link.requiredPlan, link.label, workspace.state.billing.featureFlags)
                    if (isLocked && link.requiredPlan) {
                      return (
                        <div key={link.href} className={`rounded-xl py-2 pl-3 pr-3 text-sm font-medium ${active ? "border-l-2 border-teal-600 bg-teal-50/50 text-zinc-900" : "text-zinc-400"}`}>
                          <div className="flex items-center gap-3">
                            <Icon className={`h-4 w-4 shrink-0 ${active ? "text-teal-600" : "text-zinc-600"}`} />
                            <span className={`flex-1 ${active ? "font-semibold" : ""}`}>{link.label}</span>
                          </div>
                          <button
                            onClick={() => setUpgradePrompt({ plan: link.requiredPlan!, reason: `${link.label.toLowerCase()} locked` })}
                            className="ml-7 mt-2 rounded-lg bg-teal px-2.5 py-1 text-[10px] font-bold text-white shadow-sm transition-colors hover:bg-teal-600"
                          >
                            Unlock - Upgrade to {link.requiredPlan}
                          </button>
                        </div>
                      )
                    }
                    return (
                      <Link key={link.href} href={withClientParam(link.href, activeClientId)} className={`flex cursor-pointer items-center gap-3 rounded-xl py-2 pl-3 pr-3 text-sm transition-all group ${active ? "border-l-2 border-teal-600 bg-teal-50/50 font-semibold text-zinc-900" : "font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}>
                        <Icon className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-teal-600" : "text-zinc-600 group-hover:text-zinc-300"}`} />
                        <span className={`flex-1 ${active ? "font-semibold" : ""}`}>{link.label}</span>
                      </Link>
                    )
                  })}
                </div> : null}
              </div>
            ))}
          </nav>
        </div>

        <div className="shrink-0 space-y-3 border-t border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700 text-white font-bold overflow-hidden">
              {user?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.imageUrl} alt={user.fullName} className="h-full w-full object-cover" />
              ) : user?.fullName.charAt(0)}
              {user?.linkedinMemberId && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#0A66C2] border-2 border-zinc-900 flex items-center justify-center"><LinkedInIcon className="h-1.5 w-1.5 text-white" /></span>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5"><p className="text-sm font-bold text-white truncate leading-none">{user?.fullName}</p><span className="shrink-0 rounded-full bg-gold/10 px-1.5 py-0.5 text-[9px] font-bold text-gold uppercase tracking-wider">{workspace.state.billing.plan}</span>{workspace.state.billing.overrideActive ? <span className="shrink-0 rounded-full bg-teal/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal-100">Override active</span> : null}{user?.role === "admin" ? <span className="shrink-0 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-200">Admin</span> : null}</div>
              <p className="text-xs text-zinc-500 truncate mt-1">{user?.email}</p>
            </div>
          </div>

          <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-800/40 hover:bg-zinc-800 px-4 py-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors">Sign out</button>
        </div>
      </aside>

      <header className="hidden md:flex h-16 border-b border-zinc-100 bg-white/90 backdrop-blur-sm fixed top-0 right-0 left-64 z-20 items-center justify-between px-8 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div className="relative w-80" ref={searchRef}>
          <div className="relative flex items-center">
            <svg className="absolute left-3.5 h-4 w-4 text-zinc-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Search posts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setSearchFocused(true)} className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 pl-10 pr-4 py-2 text-sm text-zinc-900 outline-none focus:bg-white focus:border-teal/50 focus:ring-4 focus:ring-teal/10 transition-all" />
          </div>
          {searchFocused && searchQuery.trim() && (
            <div className="qalam-scrollbar absolute left-0 right-0 mt-1 max-h-80 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-xl z-40 overflow-hidden divide-y divide-zinc-100">
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

          {/* User avatar dropdown */}
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => setUserDropdownOpen((v) => !v)}
              aria-label="User menu"
              aria-expanded={userDropdownOpen}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-zinc-200 bg-zinc-800 text-xs font-bold text-white transition-colors hover:border-teal/50"
            >
              {user?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.imageUrl} alt={user.fullName} className="h-full w-full object-cover" />
              ) : (
                <span>{user?.fullName?.charAt(0) || "U"}</span>
              )}
            </button>
            {userDropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl divide-y divide-zinc-100">
                <div className="px-4 py-3">
                  <p className="truncate text-sm font-semibold text-zinc-900">{user?.fullName}</p>
                  <p className="truncate text-xs text-zinc-500">{user?.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    href={withClientParam("/settings", activeClientId)}
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    <ProfileIcon className="h-4 w-4 text-zinc-400" />
                    Profile
                  </Link>
                  <Link
                    href={withClientParam("/settings", activeClientId)}
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Settings
                  </Link>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setUserDropdownOpen(false); signOut({ callbackUrl: "/" }) }}
                    className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <header className="flex md:hidden flex-col border-b border-zinc-200 bg-white/90 backdrop-blur fixed top-0 inset-x-0 z-30" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="flex h-14 w-full items-center justify-between px-4">
          <div className="flex items-center gap-2"><QalamMark size={28} /><span className="text-sm font-extrabold text-zinc-900 tracking-tight">Qalam</span></div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-teal/5 border border-teal/10 px-2.5 py-0.5 text-[10px] font-bold text-teal max-w-[120px] truncate">{activeClientName}</span>
            <button onClick={() => setSearchFocused((value) => !value)} className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors" aria-label="Toggle mobile search"><svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></button>
            <button onClick={() => setSwitcherOpen((value) => !value)} className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors" aria-label="Toggle workspace switcher"><svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg></button>
          </div>
        </div>

        {searchFocused && (
          <div className="absolute left-0 right-0 bg-white border-b border-zinc-200 px-4 py-3 shadow-lg z-40 animate-fade-in" style={{ top: "calc(3.5rem + env(safe-area-inset-top, 0px))" }} ref={searchRef}>
            <div className="relative flex items-center">
              <input type="text" placeholder="Search posts and drafts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-4 pr-16 py-2 text-xs text-zinc-900 outline-none focus:bg-white focus:border-teal/50 transition-all" />
              <button onClick={() => { setSearchFocused(false); setSearchQuery("") }} className="absolute right-3 text-xs text-zinc-400 font-bold hover:text-zinc-600">Close</button>
            </div>
            {searchQuery.trim() && <div className="qalam-scrollbar mt-2 max-h-60 overflow-y-auto rounded-xl border border-zinc-100 bg-white overflow-hidden divide-y divide-zinc-50">{searchResults.length === 0 ? <div className="px-4 py-4 text-center text-xs text-zinc-500">No results found.</div> : searchResults.map((post) => <button key={post.id} onClick={() => handleOpenPost(post)} className="w-full cursor-pointer flex items-center justify-between gap-4 px-3 py-2.5 text-left hover:bg-zinc-50 transition-colors"><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-zinc-900 truncate">{post.title}</p><p className="text-[10px] text-zinc-400 font-medium truncate">{post.status} - {post.type}</p></div></button>)}</div>}
          </div>
        )}

        {switcherOpen && (
          <div className="absolute right-4 w-56 bg-white border border-zinc-200 rounded-xl shadow-xl z-40 overflow-hidden divide-y divide-zinc-100 animate-scale-in" style={{ top: "calc(3.5rem + env(safe-area-inset-top, 0px))" }} ref={switcherRef}>
            <div className="px-4 py-2 bg-zinc-50/50 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active Workspace</div>
            <div className="bg-teal/5 px-4 py-2.5 text-xs font-bold text-teal">{activeClientName}</div>
            <div>
              {showManageClientList ? <Link href={withClientParam("/agency", activeClientId)} onClick={() => setSwitcherOpen(false)} className="block px-4 py-2.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50">Manage client list &gt;</Link> : null}
              {canAddWorkspace ? (
                <button onClick={handleAddWorkspace} className="w-full cursor-pointer px-4 py-2.5 text-left text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50">Add workspace</button>
              ) : (
                <div className="px-3 py-2 text-xs text-zinc-500">
                  Add workspace - <a href="/pricing?plan=Agency" className="text-teal-600 hover:underline">Unlock in Agency</a>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="qalam-app-canvas pl-0 md:pl-64">
        {workspace.state.billing.planExpired ? (
          <div className="relative z-10 border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm font-semibold text-amber-900">
            Your plan expired. You are back on Free. <Link href="/pricing" className="underline underline-offset-2">Renew your plan</Link>
          </div>
        ) : null}
        {workspace.state.billing.complimentaryTrialBanner ? (
          <div className="relative z-10 border-b border-teal/20 bg-teal/5 px-6 py-3 text-sm font-semibold text-teal-900">
            You are on a complimentary {workspace.state.billing.overridePlan || workspace.state.billing.plan} trial. <Link href="/pricing" className="underline underline-offset-2">Upgrade to keep these features</Link>
          </div>
        ) : null}
        <div className="relative z-10 animate-fade-in">{children}</div>
      </main>
      {upgradePrompt ? <UpgradeModal currentPlan={currentPlan} requiredPlan={upgradePrompt.plan} reason={upgradePrompt.reason} onClose={() => setUpgradePrompt(null)} /> : null}
    </div>
  )
}
