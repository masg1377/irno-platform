import type { TaxonomyTermType, TaxonomyTermStatus } from './enums.js'

// ── Taxonomy Term ──────────────────────────────────────────────────────────────

export interface TaxonomyTermDto {
  id: string
  type: TaxonomyTermType
  title: string
  slug: string
  description: string | null
  parentId: string | null
  parentTitle: string | null
  status: TaxonomyTermStatus
  sortOrder: number
  color: string | null
  icon: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedTaxonomyTerms {
  data: TaxonomyTermDto[]
  total: number
  page: number
  limit: number
}

// ── Lookup ─────────────────────────────────────────────────────────────────────

/**
 * Lightweight option for entity selectors.
 * Used by all lookup endpoints to avoid exposing full DTOs in dropdowns.
 */
export interface LookupOptionDto {
  id: string
  label: string
  subtitle?: string | null
  status?: string | null
  metadata?: Record<string, unknown> | null
}
