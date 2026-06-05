export const PLAN_HIERARCHY = ['free', 'pro', 'growth', 'agency']

export const PLAN_LABELS = {
  free: 'Free',
  pro: 'Pro',
  growth: 'Growth',
  agency: 'Agency',
}

export const PLAN_PRICES = {
  free: 'PKR 0',
  pro: 'PKR 3,499 / mo',
  growth: 'PKR 6,999 / mo',
  agency: 'PKR 14,999 / mo',
}

// Minimum plan required per feature
export const FEATURE_REQUIRES = {
  basic_draft: 'free',
  library: 'free',
  preview: 'free',
  voice_fingerprint: 'pro',
  calendar: 'pro',
  scheduling: 'pro',
  signal_scoring: 'pro',
  analytics: 'pro',
  competitor_monitor: 'growth',
  audience_insights: 'growth',
  hashtag_generator: 'growth',
  agency_workspaces: 'agency',
}

export const FEATURE_META = {
  voice_fingerprint: {
    label: 'Voice Fingerprint',
    desc: 'Build and refine your tonal profile so every draft stays on-brand without a second thought.',
  },
  calendar: {
    label: 'Publishing Calendar',
    desc: 'See your publishing week at a glance. Plan, batch, and ship on schedule.',
  },
  scheduling: {
    label: 'Post Scheduling',
    desc: 'Schedule posts to LinkedIn, X, and Threads at the exact time you want.',
  },
  signal_scoring: {
    label: 'Post Signal',
    desc: 'Score every draft on hook strength, engagement patterns, and what to sharpen before you publish.',
  },
  analytics: {
    label: 'Analytics',
    desc: 'Track engagement, best posting times, writing volume, and how your authority grows over time.',
  },
  competitor_monitor: {
    label: 'Competitor Monitor',
    desc: 'Track the people you watch and reference them as you plan your content strategy.',
  },
  audience_insights: {
    label: 'Audience Insights',
    desc: 'Analyze comment patterns, sentiment trends, and the topics your audience cares about.',
  },
  hashtag_generator: {
    label: 'Hashtag Generator',
    desc: 'Generate targeted, relevant hashtags based on your post content and platform.',
  },
  agency_workspaces: {
    label: 'Agency Workspace',
    desc: 'Run multiple client voices from one clean dashboard with isolated workspaces per client.',
  },
}

/**
 * Returns true if userPlan meets or exceeds the plan required for the feature.
 */
export function canAccess(userPlan, feature) {
  const required = FEATURE_REQUIRES[feature]
  if (!required) return true
  const userIdx = PLAN_HIERARCHY.indexOf(userPlan ?? 'free')
  const reqIdx = PLAN_HIERARCHY.indexOf(required)
  if (userIdx < 0 || reqIdx < 0) return false
  return userIdx >= reqIdx
}

export function requiredPlan(feature) {
  return FEATURE_REQUIRES[feature] ?? 'free'
}
