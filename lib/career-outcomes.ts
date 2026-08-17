import { z } from "zod"

export const applicationStatuses = [
  "saved",
  "applied",
  "screening",
  "interview",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
  "archived",
] as const

export type ApplicationStatus = (typeof applicationStatuses)[number]

const optionalUrl = z.string().trim().url().max(1000).or(z.literal("")).optional()

export const applicationCreateSchema = z.object({
  workspaceKey: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(180),
  company: z.string().trim().min(1).max(180),
  location: z.string().trim().max(180).default(""),
  employmentType: z.string().trim().max(80).default(""),
  sourceUrl: optionalUrl,
  sourceName: z.string().trim().max(80).default(""),
  description: z.string().trim().max(50000).default(""),
  resumeId: z.string().uuid().nullable().optional(),
  status: z.enum(applicationStatuses).default("saved"),
  excitement: z.number().int().min(1).max(5).nullable().optional(),
  appliedAt: z.string().datetime().nullable().optional(),
  nextAction: z.string().trim().max(500).default(""),
  nextActionAt: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(10000).default(""),
})

export const applicationUpdateSchema = z.object({
  workspaceKey: z.string().uuid().optional(),
  status: z.enum(applicationStatuses).optional(),
  resumeId: z.string().uuid().nullable().optional(),
  excitement: z.number().int().min(1).max(5).nullable().optional(),
  nextAction: z.string().trim().max(500).optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(10000).optional(),
  rejectionReason: z.string().trim().max(1000).nullable().optional(),
  offerAmount: z.number().nonnegative().nullable().optional(),
  offerCurrency: z.string().trim().max(8).nullable().optional(),
})

export const evidenceTypes = ["achievement", "skill", "credential", "work_sample", "experience", "education"] as const

export const evidenceSchema = z.object({
  workspaceKey: z.string().uuid().optional(),
  evidenceType: z.enum(evidenceTypes),
  title: z.string().trim().min(1).max(180),
  summary: z.string().trim().max(5000).default(""),
  sourceUrl: optionalUrl,
  issuer: z.string().trim().max(180).optional(),
  occurredOn: z.string().date().nullable().optional(),
  skills: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  metrics: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
})

export const consentSchema = z.object({
  workspaceKey: z.string().uuid().optional(),
  recruiterDiscovery: z.boolean(),
  outcomeLearning: z.boolean(),
  partnerReporting: z.boolean(),
})
