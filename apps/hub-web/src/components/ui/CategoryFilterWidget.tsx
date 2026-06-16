'use client'

/**
 * CategoryFilterWidget — standalone category filter for server-rendered list pages.
 *
 * Usage: place this anywhere in the filter bar.
 * When a taxonomy category is selected/cleared, it immediately updates the URL
 * (router.push), preserving all other existing query params.
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { TaxonomySelect } from './TaxonomySelect'

export interface CategoryFilterWidgetProps {
  /** e.g. 'COURSE_CATEGORY', 'SKILL_CATEGORY', etc. */
  taxonomyType: string
  /** Current categoryId value from URL searchParams */
  currentCategoryId?: string
  /** Current category label (for display; fetched from lookup on mount if not provided) */
  currentCategoryLabel?: string
  placeholder?: string
}

export function CategoryFilterWidget({
  taxonomyType,
  currentCategoryId,
  currentCategoryLabel,
  placeholder = 'فیلتر بر اساس دسته‌بندی',
}: CategoryFilterWidgetProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(id: string) {
    const qs = new URLSearchParams(searchParams.toString())
    if (id) {
      qs.set('categoryId', id)
    } else {
      qs.delete('categoryId')
    }
    // Reset to first page when filter changes
    qs.delete('page')
    router.push(`?${qs.toString()}`)
  }

  return (
    <div className="w-56">
      <TaxonomySelect
        type={taxonomyType}
        value={currentCategoryId ?? ''}
        onChange={handleChange}
        placeholder={placeholder}
        initialLabel={currentCategoryLabel ?? null}
      />
    </div>
  )
}
