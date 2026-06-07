import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import { addDays } from 'date-fns'
import { toast } from 'sonner'
import {
  defaultWorkspace,
  loadLocalWorkspace,
  saveLocalWorkspace,
  createSupabaseClient,
  loadRemoteWorkspace,
  pushRemoteWorkspace,
  mergeWorkspaces,
  normalizeWorkspace,
} from '@/lib/workspaceStore'

const AppContext = createContext(null)

const nextId = () => crypto.randomUUID()

export function AppProvider({ children }) {
  const user = null
  const userLoaded = true
  const userId = user?.id ?? null

  const [hydrated, setHydrated] = useState(false)
  const [posts, setPosts] = useState([])
  const [profile, setProfile] = useState(defaultWorkspace(null).profile)
  const [voiceSettings, setVoiceSettings] = useState(defaultWorkspace(null).voiceSettings)
  const [agencyClients, setAgencyClients] = useState([])
  const [plan, setPlan] = useState('pro')

  const workspaceRef = useRef(null)
  const saveTimer = useRef(null)

  const persistNow = useCallback(async () => {
    const ws = workspaceRef.current
    if (!ws || !userId) return
    saveLocalWorkspace(userId, ws)
    const sb = createSupabaseClient()
    if (!sb) return
    try {
      await pushRemoteWorkspace(sb, userId, ws)
    } catch (e) {
      console.warn('[Qalam] Supabase sync failed (using local only):', e?.message || e)
    }
  }, [userId])

  const schedulePersist = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      persistNow()
    }, 600)
  }, [persistNow])

  // Load persisted plan per user
  useEffect(() => {
    if (!userLoaded || !userId) return
    const stored = localStorage.getItem(`qalam_plan_${userId}`)
    if (stored) setPlan(stored)
  }, [userLoaded, userId])

  const changePlan = useCallback((newPlan) => {
    setPlan(newPlan)
    if (userId) localStorage.setItem(`qalam_plan_${userId}`, newPlan)
  }, [userId])

  useEffect(() => {
    if (!userLoaded) return
    if (!userId) {
      setPosts([])
      setProfile(defaultWorkspace(null).profile)
      setVoiceSettings(defaultWorkspace(null).voiceSettings)
      setAgencyClients([])
      setHydrated(true)
      return
    }

    let cancelled = false
    ;(async () => {
      const local = loadLocalWorkspace(userId)
      let merged = normalizeWorkspace(local, user)

      const sb = createSupabaseClient()
      if (sb) {
        try {
          const remote = await loadRemoteWorkspace(sb, userId)
          if (!cancelled && remote) {
            merged = mergeWorkspaces(local, remote, user)
          }
        } catch (e) {
          console.warn('[Qalam] Remote load failed:', e?.message || e)
        }
      }

      if (cancelled) return
      merged.updatedAt = merged.updatedAt || new Date().toISOString()
      workspaceRef.current = merged
      setPosts(merged.posts || [])
      setProfile(merged.profile)
      setVoiceSettings(merged.voiceSettings)
      setAgencyClients(merged.agencyClients || [])
      saveLocalWorkspace(userId, merged)
      setHydrated(true)
    })()

    return () => {
      cancelled = true
    }
  }, [userLoaded, userId, user])

  useEffect(() => {
    if (!hydrated || !userId) return
    const ws = {
      updatedAt: new Date().toISOString(),
      posts,
      profile,
      voiceSettings,
      agencyClients,
    }
    workspaceRef.current = ws
    schedulePersist()
  }, [hydrated, userId, posts, profile, voiceSettings, agencyClients, schedulePersist])

  const saveDraft = useCallback((title, content, type = 'Text post') => {
    const ts = Date.now()
    const newPost = {
      id: nextId(),
      title: title || 'Untitled draft',
      status: 'draft',
      type,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      scheduledDate: null,
      scheduledTime: null,
      engagement: '—',
      category: 'Draft',
      content,
      createdAt: ts,
    }
    setPosts((prev) => [newPost, ...prev])
    toast.success('Draft saved', { description: 'Available in your post library.' })
    return newPost.id
  }, [])

  const schedulePost = useCallback((title, content, type, dateLabel, time) => {
    const ts = Date.now()
    const newPost = {
      id: nextId(),
      title: title || 'Untitled post',
      status: 'scheduled',
      type: type || 'Text post',
      date: dateLabel,
      scheduledDate: addDays(new Date(), 1),
      scheduledTime: time || '9:00 AM',
      engagement: '—',
      category: 'Scheduled',
      content,
      createdAt: ts,
    }
    setPosts((prev) => [newPost, ...prev])
    toast.success('Post scheduled', {
      description: `Publishes ${dateLabel} at ${time || '9:00 AM'}.`,
    })
    return newPost.id
  }, [])

  const deletePost = useCallback((id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id))
    toast('Post removed', { description: 'Deleted from your library.' })
  }, [])

  const updatePost = useCallback((id, updates) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }, [])

  const addAgencyClient = useCallback((payload) => {
    const row = {
      id: crypto.randomUUID(),
      name: payload.name,
      company: payload.company || '',
      avatar: (payload.name || '?').slice(0, 2).toUpperCase(),
      plan: payload.plan || 'Pro',
      postsThisMonth: 0,
      status: 'active',
      pendingApprovals: 0,
      teamMembers: [],
      voiceScore: 0,
      linkedinUrl: payload.linkedinUrl || '',
    }
    setAgencyClients((prev) => [...prev, row])
    toast.success('Client workspace created')
    return row.id
  }, [])

  const drafts = posts.filter((p) => p.status === 'draft')
  const scheduled = posts.filter((p) => p.status === 'scheduled')
  const published = posts.filter((p) => p.status === 'published')

  return (
    <AppContext.Provider
      value={{
        workspaceReady: hydrated && Boolean(userId),
        posts,
        drafts,
        scheduled,
        published,
        saveDraft,
        schedulePost,
        deletePost,
        updatePost,
        setPosts,
        profile,
        setProfile,
        voiceSettings,
        setVoiceSettings,
        agencyClients,
        setAgencyClients,
        addAgencyClient,
        plan,
        changePlan,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
