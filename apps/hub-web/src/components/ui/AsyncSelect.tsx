'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { fa } from '@irno/i18n'
import type { LookupOptionDto } from '@irno/types'

export interface AsyncSelectProps {
  endpoint: string
  queryParams?: Record<string, string>
  value: string
  onChange: (id: string, label?: string) => void
  placeholder?: string
  disabled?: boolean
  name?: string
  className?: string
  initialLabel?: string | null
}

const inputCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20'

export function AsyncSelect({
  endpoint,
  queryParams,
  value,
  onChange,
  placeholder,
  disabled,
  name,
  className,
  initialLabel,
}: AsyncSelectProps) {
  const [query, setQuery] = useState('')
  const [displayText, setDisplayText] = useState(initialLabel ?? '')
  const [options, setOptions] = useState<LookupOptionDto[]>([])
  const [open, setOpen] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [touched, setTouched] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // If value changes externally and we have no display text yet, try to resolve it
  useEffect(() => {
    if (value && !displayText && !initialLabel) {
      // Fetch with the id to resolve the label
      const params = new URLSearchParams({ search: '', limit: '1', id: value, ...(queryParams ?? {}) })
      fetch(`${endpoint}?${params.toString()}`, { credentials: 'include' })
        .then((r) => r.json())
        .then((raw) => {
          const list: LookupOptionDto[] = raw.data ?? raw
          const found = list.find((o) => o.id === value)
          if (found) setDisplayText(found.label)
        })
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // When initialLabel changes after mount
  useEffect(() => {
    if (initialLabel) setDisplayText(initialLabel)
  }, [initialLabel])

  const fetchOptions = useCallback(
    (search: string) => {
      setFetching(true)
      const params = new URLSearchParams({ search, limit: '50', ...(queryParams ?? {}) })
      fetch(`${endpoint}?${params.toString()}`, { credentials: 'include' })
        .then((r) => r.json())
        .then((raw) => {
          const list: LookupOptionDto[] = raw.data ?? raw
          setOptions(Array.isArray(list) ? list : [])
        })
        .catch(() => setOptions([]))
        .finally(() => setFetching(false))
    },
    [endpoint, queryParams],
  )

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    setDisplayText(val)
    setTouched(true)
    setOpen(true)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchOptions(val)
    }, 300)
  }

  function handleFocus() {
    if (!touched) fetchOptions(query)
    setOpen(true)
  }

  function handleSelect(opt: LookupOptionDto) {
    setDisplayText(opt.label)
    setQuery('')
    setOpen(false)
    setTouched(false)
    onChange(opt.id, opt.label)
  }

  function handleClear() {
    setDisplayText('')
    setQuery('')
    setOpen(false)
    setTouched(false)
    onChange('', undefined)
    fetchOptions('')
  }

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        // If user typed but didn't select, revert to last known label
        if (touched && value && displayText !== query) {
          // keep displayText as-is
        }
        setTouched(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [touched, value, displayText, query])

  const shown = touched ? query : displayText
  const effectivePlaceholder = placeholder ?? fa.lookup.selectPlaceholder

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      {/* Hidden input for form submission */}
      {name && <input type="hidden" name={name} value={value} />}

      <div className="relative">
        <input
          type="text"
          value={shown}
          onChange={handleInputChange}
          onFocus={handleFocus}
          disabled={disabled}
          placeholder={effectivePlaceholder}
          className={inputCls}
          autoComplete="off"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            tabIndex={-1}
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-lg">
          {fetching ? (
            <div className="px-4 py-3 text-sm text-[var(--color-text-muted)]">{fa.lookup.loading}</div>
          ) : options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[var(--color-text-muted)]">{fa.lookup.noResults}</div>
          ) : (
            options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt)}
                className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-right transition-colors hover:bg-[var(--color-bg-muted)]"
              >
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{opt.label}</span>
                {opt.subtitle && (
                  <span className="text-xs text-[var(--color-text-muted)]">{opt.subtitle}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
