'use client'

import { AsyncSelect } from './AsyncSelect'

export interface TaxonomySelectProps {
  type: string
  value: string
  onChange: (id: string, title?: string) => void
  placeholder?: string
  disabled?: boolean
  name?: string
  className?: string
  initialLabel?: string | null
}

/**
 * A specialised AsyncSelect for TaxonomyTerm lookups.
 * Queries /api/v1/lookup/taxonomy?type=<type>&search=...
 */
export function TaxonomySelect({
  type,
  value,
  onChange,
  placeholder,
  disabled,
  name,
  className,
  initialLabel,
}: TaxonomySelectProps) {
  return (
    <AsyncSelect
      endpoint="/api/v1/lookup/taxonomy"
      queryParams={{ type }}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      name={name}
      className={className}
      initialLabel={initialLabel}
    />
  )
}
