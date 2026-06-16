import { cookies } from 'next/headers'
import type {
  CareerProfileDto,
  ResumeDocumentDto,
  PaginatedResumeDocuments,
  ResumeSectionDto,
  ResumeTemplateDto,
  PortfolioProjectDto,
  PaginatedPortfolioProjects,
  RoadmapDto,
  PaginatedRoadmaps,
  JobMatchReportDto,
  ResumeCheckReportDto,
  ResumeExportDto,
  PublicResumeDto,
  PublicPortfolioProjectDto,
} from '@irno/types'

/**
 * Server-side API helpers for career-web server components.
 * Calls hub-api directly (server-to-server) via HUB_API_URL.
 * Forwards irno_at cookie so hub-api can authenticate the user.
 */

const API_BASE = (process.env['HUB_API_URL'] ?? 'http://localhost:4000') + '/api/v1'

async function apiGet<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('irno_at')?.value
  if (!token) return null
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = await res.json()
    return (json?.data ?? json) as T
  } catch {
    return null
  }
}

// ── Career Profile ─────────────────────────────────────────────────────────

export async function getCareerProfile(): Promise<CareerProfileDto | null> {
  return apiGet<CareerProfileDto>('/career/me')
}

export async function getPublicResume(slug: string): Promise<PublicResumeDto | null> {
  try {
    const res = await fetch(`${API_BASE}/career/public/${slug}`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    return (json?.data ?? json) as PublicResumeDto
  } catch {
    return null
  }
}

export async function getPublicPortfolioProject(slug: string, projectSlug: string): Promise<PublicPortfolioProjectDto | null> {
  try {
    const res = await fetch(`${API_BASE}/career/public/${slug}/projects/${projectSlug}`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    return (json?.data ?? json) as PublicPortfolioProjectDto
  } catch {
    return null
  }
}

// ── Resumes ────────────────────────────────────────────────────────────────

export async function listResumes(page = 1, pageSize = 20): Promise<PaginatedResumeDocuments | null> {
  return apiGet<PaginatedResumeDocuments>(`/career/resumes?page=${page}&pageSize=${pageSize}`)
}

export async function getResume(id: string): Promise<ResumeDocumentDto | null> {
  return apiGet<ResumeDocumentDto>(`/career/resumes/${id}`)
}

export async function listSections(resumeId: string): Promise<ResumeSectionDto[] | null> {
  return apiGet<ResumeSectionDto[]>(`/career/resumes/${resumeId}/sections`)
}

// ── Templates ──────────────────────────────────────────────────────────────

export async function listTemplates(): Promise<ResumeTemplateDto[] | null> {
  return apiGet<ResumeTemplateDto[]>('/career/templates')
}

// ── Portfolio ──────────────────────────────────────────────────────────────

export async function listPortfolioProjects(page = 1): Promise<PaginatedPortfolioProjects | null> {
  return apiGet<PaginatedPortfolioProjects>(`/career/portfolio/projects?page=${page}`)
}

// ── Roadmaps ───────────────────────────────────────────────────────────────

export async function listRoadmaps(): Promise<PaginatedRoadmaps | null> {
  return apiGet<PaginatedRoadmaps>('/career/roadmaps')
}

export async function getRoadmap(slug: string): Promise<RoadmapDto | null> {
  try {
    const res = await fetch(`${API_BASE}/career/roadmaps/${slug}`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    return (json?.data ?? json) as RoadmapDto
  } catch {
    return null
  }
}

// ── Job Match ──────────────────────────────────────────────────────────────

export async function listJobMatchReports(): Promise<JobMatchReportDto[] | null> {
  return apiGet<JobMatchReportDto[]>('/career/job-match')
}

// ── Checker ────────────────────────────────────────────────────────────────

export async function listCheckReports(resumeId: string): Promise<ResumeCheckReportDto[] | null> {
  return apiGet<ResumeCheckReportDto[]>(`/career/resumes/${resumeId}/checks`)
}

// ── Exports ────────────────────────────────────────────────────────────────

export async function listExports(resumeId: string): Promise<ResumeExportDto[] | null> {
  return apiGet<ResumeExportDto[]>(`/career/resumes/${resumeId}/exports`)
}

// ── Portfolio (new Phase 19 helpers) ──────────────────────────────────────────

export async function getCareerProfilePublic(slug: string): Promise<any | null> {
  try {
    const API_BASE_INTERNAL = (process.env['HUB_API_URL'] ?? 'http://localhost:4000') + '/api/v1'
    const res = await fetch(`${API_BASE_INTERNAL}/career/public/${slug}`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    return (json?.data ?? json) as any
  } catch {
    return null
  }
}
