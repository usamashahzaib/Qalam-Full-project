import { createClient } from '@supabase/supabase-js'

const STORAGE_PREFIX = 'qalam_workspace_v1_'

export function defaultVoiceSettings() {
  return {
    consistencyScore: 0,
    toneProfile: [
      { trait: 'Directness', value: 50 },
      { trait: 'Warmth', value: 50 },
      { trait: 'Authority', value: 50 },
      { trait: 'Storytelling', value: 50 },
      { trait: 'Data-driven', value: 50 },
      { trait: 'Vulnerability', value: 50 },
    ],
    bannedPhrases: [],
    aiVoiceSummary: null,
    signatureMoves: [],
  }
}

export function defaultWorkspace(clerkUser) {
  const name =
    clerkUser?.fullName ||
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') ||
    clerkUser?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    'Creator'
  return {
    updatedAt: new Date().toISOString(),
    posts: [],
    profile: {
      name,
      title: '',
      linkedinUrl: '',
      industry: '',
      goals: [],
      tone: 'Professional & direct',
    },
    voiceSettings: defaultVoiceSettings(),
    agencyClients: [],
  }
}

function normalizeWorkspace(raw, clerkUser) {
  const base = defaultWorkspace(clerkUser)
  if (!raw || typeof raw !== 'object') return base
  return {
    ...base,
    ...raw,
    profile: { ...base.profile, ...(raw.profile || {}) },
    voiceSettings: {
      ...base.voiceSettings,
      ...(raw.voiceSettings || {}),
      toneProfile: raw.voiceSettings?.toneProfile || base.voiceSettings.toneProfile,
      bannedPhrases: raw.voiceSettings?.bannedPhrases ?? base.voiceSettings.bannedPhrases,
      aiVoiceSummary: raw.voiceSettings?.aiVoiceSummary ?? base.voiceSettings.aiVoiceSummary,
      signatureMoves: raw.voiceSettings?.signatureMoves ?? base.voiceSettings.signatureMoves,
    },
    posts: Array.isArray(raw.posts) ? raw.posts : [],
    agencyClients: Array.isArray(raw.agencyClients) ? raw.agencyClients : [],
  }
}

export function loadLocalWorkspace(userId) {
  if (!userId || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveLocalWorkspace(userId, workspace) {
  if (!userId || typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(workspace))
}

export function createSupabaseWithClerk(getToken, template) {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon || !getToken) return null
  const tmpl = template || import.meta.env.VITE_CLERK_JWT_TEMPLATE || 'supabase'
  return createClient(url, anon, {
    global: {
      fetch: async (input, init = {}) => {
        const headers = new Headers(init.headers)
        const token = await getToken({ template: tmpl })
        if (token) headers.set('Authorization', `Bearer ${token}`)
        return fetch(input, { ...init, headers })
      },
    },
  })
}

export async function loadRemoteWorkspace(sb, userId) {
  const { data, error } = await sb
    .from('user_workspace')
    .select('data, updated_at')
    .eq('clerk_user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function pushRemoteWorkspace(sb, userId, workspace) {
  const updatedAt = workspace.updatedAt || new Date().toISOString()
  const { error } = await sb.from('user_workspace').upsert(
    {
      clerk_user_id: userId,
      data: { ...workspace, updatedAt },
      updated_at: updatedAt,
    },
    { onConflict: 'clerk_user_id' }
  )
  if (error) throw error
}

export function mergeWorkspaces(localW, remoteRow, clerkUser) {
  const local = normalizeWorkspace(localW || {}, clerkUser)
  if (!remoteRow?.data) return local
  const remote = normalizeWorkspace(remoteRow.data, clerkUser)
  const tLocal = new Date(local.updatedAt || 0).getTime()
  const tRemote = new Date(remoteRow.updated_at || remote.updatedAt || 0).getTime()
  if (tRemote >= tLocal) {
    remote.updatedAt = new Date(remoteRow.updated_at || Date.now()).toISOString()
    return remote
  }
  return local
}

export { normalizeWorkspace }
