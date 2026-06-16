import { z } from 'zod'

const urlString = z.string().max(500)
const record = z.record(z.string(), z.unknown())

export const updateCareerProfileSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  headline: z.string().max(500).nullish(),
  summary: z.string().max(5000).nullish(),
  location: z.string().max(255).nullish(),
  phone: z.string().max(50).nullish(),
  email: z.string().max(255).nullish(),
  website: urlString.nullish(),
  linkedinUrl: urlString.nullish(),
  githubUrl: urlString.nullish(),
  portfolioUrl: urlString.nullish(),
  avatarUrl: urlString.nullish(),
  visibility: z.enum(['PRIVATE', 'PUBLIC_LINK', 'DISABLED']).optional(),
  publicSlug: z.string().min(3).max(100).nullish(),
})

export const createResumeDocumentSchema = z.object({
  title: z.string().min(1).max(500),
  targetRole: z.string().max(500).optional(),
  language: z.enum(['FA', 'EN', 'FA_EN']).optional(),
  templateId: z.string().uuid().optional(),
  visibility: z.enum(['PRIVATE', 'PUBLIC_LINK', 'DISABLED']).optional(),
})

export const updateResumeDocumentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  targetRole: z.string().max(500).nullish(),
  language: z.enum(['FA', 'EN', 'FA_EN']).optional(),
  templateId: z.string().uuid().nullish(),
  visibility: z.enum(['PRIVATE', 'PUBLIC_LINK', 'DISABLED']).optional(),
  publicSlug: z.string().min(3).max(100).nullish(),
  styleConfig: record.nullish(),
  settings: record.nullish(),
})

export const createResumeSectionSchema = z.object({
  type: z.enum([
    'SUMMARY', 'EXPERIENCE', 'EDUCATION', 'PROJECT', 'SKILL',
    'CERTIFICATE', 'COURSE', 'CREDIT', 'EVENT', 'LANGUAGE',
    'LINK', 'CUSTOM', 'TEXT_BLOCK',
  ]),
  title: z.string().min(1).max(500),
  content: record.optional(),
  layoutConfig: record.optional(),
  sortOrder: z.number().int().min(0).optional(),
  isVisible: z.boolean().optional(),
})

export const updateResumeSectionSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: record.optional(),
  layoutConfig: record.nullish(),
  styleConfig: record.nullish(),
  sortOrder: z.number().int().min(0).optional(),
  isVisible: z.boolean().optional(),
})

export const reorderSectionsSchema = z.object({
  sectionIds: z.array(z.string().uuid()).min(1),
})

export const createResumeExportSchema = z.object({
  format: z.enum(['PDF', 'HTML']).optional(),
  templateId: z.string().uuid().optional(),
  includeWatermark: z.boolean().optional(),
})

const linkItem = z.object({ label: z.string(), url: z.string().max(500) })

export const createPortfolioProjectSchema = z.object({
  title: z.string().min(1).max(500),
  role: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  technologies: z.array(z.string().max(100)).optional(),
  links: z.array(linkItem).optional(),
  images: z.array(z.string().max(500)).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  visibility: z.enum(['PRIVATE', 'PUBLIC_LINK', 'PUBLIC']).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export const updatePortfolioProjectSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  role: z.string().max(255).nullish(),
  description: z.string().max(5000).nullish(),
  technologies: z.array(z.string().max(100)).optional(),
  links: z.array(linkItem).nullish(),
  images: z.array(z.string().max(500)).nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  visibility: z.enum(['PRIVATE', 'PUBLIC_LINK', 'PUBLIC']).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export const createJobMatchSchema = z.object({
  resumeDocumentId: z.string().uuid().optional(),
  jobTitle: z.string().max(500).optional(),
  jobDescription: z.string().min(50).max(20000),
})
