export type PostStatus = "draft" | "scheduled" | "published" | "archived"
export type ToneMode = "witty" | "professional" | "bold" | "storytelling" | "direct"
export type TeamRole = "owner" | "editor" | "reviewer"
export type PlanTier = "free" | "pro" | "team" | "agency"

export interface VoiceProfile {
  id: string
  userId: string
  exampleCount: number
  generationCount: number
  editDeltaScore: number        // avg % of generated content user changes (0=perfect match)
  lastTrainedAt: Date
  topPhrases: string[]
  avgSentenceLength: number
  toneDistribution: Record<ToneMode, number>
  createdAt: Date
}

export interface Post {
  id: string
  userId: string
  workspaceId?: string          // set for agency client workspace posts
  content: string
  status: PostStatus
  toneMode: ToneMode
  voiceProfileId?: string       // which voice profile was used
  createdAt: Date
  scheduledAt?: Date
  publishedAt?: Date
  linkedinPostId?: string       // LinkedIn's post ID after publishing
}

export interface PostVersion {
  id: string
  postId: string
  content: string
  version: number
  savedAt: Date
  editDeltaPercent: number      // % of AI-generated content the user changed
}

export interface AnalyticsSnapshot {
  postId: string
  capturedAt: Date
  impressions: number
  reactions: number
  comments: number
  reposts: number
  followerDelta: number
  profileViews: number
}

export interface ContentAsset {
  id: string
  userId: string
  teamId?: string
  title: string
  body: string                  // reusable narrative, framework, or angle
  usageCount: number
  lastUsedAt?: Date
  tags: string[]
  performanceScore?: number     // avg engagement of posts that used this asset
  createdAt: Date
}

export interface ConnectedAccount {
  id: string
  userId: string
  platform: "linkedin"
  profileUrl: string
  displayName: string
  followerCount: number
  connectedAt: Date
  tokenExpiresAt: Date
}

export interface UserProfile {
  id: string
  email: string
  displayName: string
  plan: PlanTier
  voiceProfileId?: string
  connectedAccountId?: string
  teamId?: string
  createdAt: Date
}

export interface Team {
  id: string
  name: string
  ownerId: string
  plan: "team" | "agency"
  brandVoiceRulebook?: string   // markdown style guide shared across all seats
  seats: TeamSeat[]
  contentLibraryIds: string[]
  createdAt: Date
}

export interface TeamSeat {
  userId: string
  role: TeamRole
  voiceProfileId?: string       // each seat has their own trained voice
  joinedAt: Date
}

export interface ClientWorkspace {
  id: string
  agencyTeamId: string
  clientName: string
  voiceProfileId?: string       // each client gets their own voice profile
  approvalRequired: boolean
  approverUserIds: string[]
  postIds: string[]
  createdAt: Date
}

export interface ApprovalRequest {
  id: string
  postId: string
  workspaceId: string
  requestedBy: string
  status: "pending" | "approved" | "rejected"
  reviewedBy?: string
  reviewedAt?: Date
  note?: string
  createdAt: Date
}
