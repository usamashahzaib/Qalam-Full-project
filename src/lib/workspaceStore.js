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

export function defaultWorkspace(authUser) {
  const name =
    authUser?.fullName ||
    [authUser?.firstName, authUser?.lastName].filter(Boolean).join(' ') ||
    authUser?.email?.split('@')[0] ||
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

function normalizeWorkspace(raw, authUser) {
  const base = defaultWorkspace(authUser)
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

export function createSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  return url && anon ? createClient(url, anon) : null
}

export async function loadRemoteWorkspace(sb, userId) {
  const { data, error } = await sb
    .from('user_workspace')
    .select('data, updated_at')
    .eq(external_user_id, userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function pushRemoteWorkspace(sb, userId, workspace) {
  const updatedAt = workspace.updatedAt || new Date().toISOString()
  const { error } = await sb.from('user_workspace').upsert(
    {
      [external_user_id]: userId,
      data: { ...workspace, updatedAt },
      updated_at: updatedAt,
    },
    { onConflict: external_user_id }
  )
  if (error) throw error
}

export function mergeWorkspaces(localW, remoteRow, authUser) {
  const local = normalizeWorkspace(localW || {}, authUser)
  if (!remoteRow?.data) return local
  const remote = normalizeWorkspace(remoteRow.data, authUser)
  const tLocal = new Date(local.updatedAt || 0).getTime()
  const tRemote = new Date(remoteRow.updated_at || remote.updatedAt || 0).getTime()
  if (tRemote >= tLocal) {
    remote.updatedAt = new Date(remoteRow.updated_at || Date.now()).toISOString()
    return remote
  }
  return local
}

export { normalizeWorkspace }
