import { z } from "zod"
import { RESUME_TEMPLATES } from "@/lib/resume-templates"

export const resumeEntrySchema = z.object({
  title: z.string().trim().max(160).default(""),
  organization: z.string().trim().max(160).default(""),
  location: z.string().trim().max(120).default(""),
  startDate: z.string().trim().max(40).default(""),
  endDate: z.string().trim().max(40).default(""),
  bullets: z.array(z.string().trim().max(500)).max(12).default([]),
})

export const resumeDataSchema = z.object({
  fullName: z.string().trim().max(160).default(""),
  email: z.string().trim().max(200).default(""),
  phone: z.string().trim().max(80).default(""),
  location: z.string().trim().max(120).default(""),
  linkedinUrl: z.string().trim().max(300).default(""),
  headline: z.string().trim().max(220).default(""),
  summary: z.string().trim().max(2000).default(""),
  skills: z.array(z.string().trim().max(120)).max(40).default([]),
  experience: z.array(resumeEntrySchema).max(20).default([]),
  education: z.array(resumeEntrySchema).max(12).default([]),
  certifications: z.array(z.string().trim().max(200)).max(20).default([]),
  projects: z.array(resumeEntrySchema).max(12).default([]),
})

export const resumeDocumentSchema = z.object({
  workspaceKey: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(160),
  templateKey: z.enum(RESUME_TEMPLATES.map((template) => template.key) as [string, ...string[]]),
  targetRole: z.string().trim().max(160).default(""),
  targetCompany: z.string().trim().max(160).default(""),
  jobDescription: z.string().trim().max(12000).default(""),
  resumeData: resumeDataSchema,
  analysis: z.record(z.string(), z.unknown()).default({}),
  atsScore: z.number().int().min(0).max(100).nullable().default(null),
  status: z.enum(["draft", "ready", "archived"]).default("draft"),
})

export type ResumeData = z.infer<typeof resumeDataSchema>

export const emptyResumeData: ResumeData = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  linkedinUrl: "",
  headline: "",
  summary: "",
  skills: [],
  experience: [],
  education: [],
  certifications: [],
  projects: [],
}
