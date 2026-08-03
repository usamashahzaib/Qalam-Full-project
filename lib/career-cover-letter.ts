import { z } from "zod"

export const coverLetterDocumentSchema = z.object({
  workspaceKey: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(160),
  targetRole: z.string().trim().max(160).default(""),
  targetCompany: z.string().trim().max(160).default(""),
  hiringManager: z.string().trim().max(160).default(""),
  jobDescription: z.string().trim().max(12000).default(""),
  content: z.string().trim().min(1).max(8000),
  status: z.enum(["ready", "archived"]).default("ready"),
})

export type CoverLetterDocument = z.infer<typeof coverLetterDocumentSchema>
