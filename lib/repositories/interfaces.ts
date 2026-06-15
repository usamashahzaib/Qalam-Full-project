import type { PlanTier } from "@/types/domain"
import type { Feature } from "@/lib/pricing"
export type { Feature }

// ─── Post ─────────────────────────────────────────────────────────────────────

export type DbPost = {
  id: string
  workspace_id: string
  author_id: string | null
  title: string
  content: string | null
  type: string
  status: string
  scheduled_time: string | null
  published_at: string | null
  external_post_urn: string | null
  created_at: string
  updated_at: string
}

export type ClientPost = {
  id: string
  title: string
  content: string
  type: string
  status: string
  date: string
  scheduledTime: string | null
  externalPostUrn: string | null
  updatedAt: string
  createdAt: string
}

export type CreatePostParams = {
  userId: string
  workspaceId: string
  authorId: string
  title: string
  content?: string
  type: string
  status: string
  scheduledTime?: string | null
  publishedAt?: string | null
  externalPostUrn?: string | null
}

export type PostPatch = {
  title?: string
  content?: string
  type?: string
  status?: string
  scheduledTime?: string | null
  publishedAt?: string | null
  externalPostUrn?: string | null
}

export interface IPostRepository {
  list(workspaceId: string): Promise<ClientPost[]>
  get(id: string, workspaceId: string): Promise<DbPost | null>
  create(params: CreatePostParams): Promise<ClientPost>
  update(id: string, workspaceId: string, patch: PostPatch): Promise<ClientPost | null>
  delete(id: string, workspaceId: string): Promise<void>
  duplicate(postId: string, workspaceId: string, userId: string, authorId: string): Promise<ClientPost>
}

// ─── Voice profile ────────────────────────────────────────────────────────────

export type VoiceProfileData = {
  name: string
  title: string
  industry: string
  tone: string
  goals: string[]
  samplePosts: string[]
  linkedinUrl: string
}

export type VoiceProfileInput = {
  name?: string | null
  title?: string | null
  industry?: string | null
  tone?: string | null
  goals?: string[]
  samplePosts?: string[]
  linkedinUrl?: string | null
}

export type VoiceAnalysis = {
  tone: string
  sentenceLength: string
  vocabulary: string
  commonPhrases: string[]
  transitions: string[]
  ctaStyle: string
}

export interface IVoiceProfileRepository {
  get(workspaceId: string): Promise<VoiceProfileData | null>
  save(workspaceId: string, data: VoiceProfileInput): Promise<VoiceProfileData>
  analyze(examplePosts: string, userId: string, plan: string): Promise<VoiceAnalysis>
}

// ─── Plan usage ───────────────────────────────────────────────────────────────

export type FeatureUsage = { used: number; limit: number; remaining: number }

export type PlanStatus = {
  plan: PlanTier
  drafts: FeatureUsage
  carousels: FeatureUsage
  hooks: FeatureUsage
  analyses: FeatureUsage
  cycleEnd?: string
}

export type IncrementResult = {
  allowed: boolean
  current: number
  limit: number
  remaining: number
  error?: string
}

export interface IPlanUsageRepository {
  getUsage(userId: string): Promise<PlanStatus>
  incrementUsage(userId: string, feature: Feature): Promise<IncrementResult>
  getLimits(plan: PlanTier): Record<Feature, number>
  getDailyActivity(userId: string, monthStart: string): Promise<{ created_at: string }[]>
}

// ─── Competitor ───────────────────────────────────────────────────────────────

export type CompetitorAnalysis = {
  hookStructure: { pattern: string; length: string; type: string }
  engagementFactors: string[]
  contentPattern: { framework: string; structure: string; estimatedReadTime: string }
  improvements: string[]
}

export type CompetitorAnalysisRecord = {
  id: string
  post_text: string
  post_url: string | null
  hook_structure: CompetitorAnalysis["hookStructure"]
  engagement_factors: CompetitorAnalysis["engagementFactors"]
  content_pattern: CompetitorAnalysis["contentPattern"]
  improvements: CompetitorAnalysis["improvements"]
  created_at: string
}

export interface ICompetitorRepository {
  saveAnalysis(
    userId: string,
    postText: string,
    postUrl: string | null,
    analysis: CompetitorAnalysis
  ): Promise<void>
  listAnalyses(userId: string, limit?: number): Promise<CompetitorAnalysisRecord[]>
  getRunsUsed(userId: string): Promise<number>
  incrementRunsUsed(userId: string, currentCount: number): Promise<void>
}
