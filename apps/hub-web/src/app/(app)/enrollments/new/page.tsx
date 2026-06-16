'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { fa } from '@irno/i18n'
import { AsyncSelect } from '@/components/ui/AsyncSelect'

interface GroupOption { id: string; name: string; courseId: string }

function NewEnrollmentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Keep legacy groups list — still a plain select filtered by selected course
  const [groups, setGroups] = useState<GroupOption[]>([])

  const [studentId, setStudentId] = useState(searchParams.get('studentId') ?? '')
  const [studentLabel, setStudentLabel] = useState('')
  const [courseId, setCourseId] = useState(searchParams.get('courseId') ?? '')
  const [courseLabel, setCourseLabel] = useState('')
  const [courseGroupId, setCourseGroupId] = useState(searchParams.get('courseGroupId') ?? '')
  const [tuition, setTuition] = useState(searchParams.get('tuition') ?? '')
  const [discount, setDiscount] = useState('0')
  const [enrollmentDate, setEnrollmentDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  const finalAmount = Math.max(0, (parseInt(tuition || '0', 10) || 0) - (parseInt(discount || '0', 10) || 0))

  // When courseId changes, fetch course groups and try to auto-fill tuition from lookup
  useEffect(() => {
    if (!courseId) { setGroups([]); setCourseGroupId(''); return }
    fetch(`/api/v1/groups?courseId=${courseId}&limit=100`, { credentials: 'include' })
      .then(r => r.json()).then(d => setGroups(d.data?.data ?? [])).catch(() => {})
    // Try to prefill tuition from course detail if not set
    if (!tuition) {
      fetch(`/api/v1/courses/${courseId}`, { credentials: 'include' })
        .then(r => r.json())
        .then(d => {
          const toman = (d.data as { defaultTuitionToman?: number })?.defaultTuitionToman
          if (toman) setTuition(String(toman))
        })
        .catch(() => {})
    }
  }, [courseId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        studentId, courseId,
        tuitionAmountToman: parseInt(tuition, 10),
        discountAmountToman: parseInt(discount || '0', 10),
        enrollmentDate,
      }
      if (courseGroupId) payload.courseGroupId = courseGroupId
      if (notes.trim()) payload.notes = notes.trim()

      const res = await fetch('/api/v1/enrollments', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json() as { id?: string; data?: { id?: string }; message?: string | string[] }
      if (!res.ok) {
        const msg = json.message
        setError(Array.isArray(msg) ? msg.join('، ') : (msg ?? fa.errors.generic))
        return
      }
      const id = json.data?.id ?? json.id
      if (id) router.push(`/enrollments/${id}`)
      router.refresh()
    } catch {
      setError(fa.errors.networkError)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20'
  const labelCls = 'mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]'

  return (
    <div className="mx-auto max-w-2xl" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{fa.enrollments.newEnrollment}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{fa.enrollments.createNote}</p>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Student — searchable async select */}
          <div>
            <label className={labelCls}>{fa.enrollments.student} <span className="text-red-500">*</span></label>
            <AsyncSelect
              endpoint="/api/v1/lookup/students"
              value={studentId}
              onChange={(id, label) => { setStudentId(id); setStudentLabel(label ?? '') }}
              placeholder={fa.lookup.selectStudent}
              initialLabel={studentLabel || null}
            />
          </div>

          {/* Course — searchable async select */}
          <div>
            <label className={labelCls}>{fa.enrollments.course} <span className="text-red-500">*</span></label>
            <AsyncSelect
              endpoint="/api/v1/lookup/courses"
              value={courseId}
              onChange={(id, label) => { setCourseId(id); setCourseLabel(label ?? ''); setCourseGroupId('') }}
              placeholder={fa.lookup.selectCourse}
              initialLabel={courseLabel || null}
            />
          </div>

          {/* Group (filtered by course — plain select is acceptable here since it depends on course) */}
          {courseId && (
            <div>
              <label className={labelCls}>{fa.enrollments.group}</label>
              {groups.length > 0 ? (
                <select value={courseGroupId} onChange={e => setCourseGroupId(e.target.value)} className={inputCls}>
                  <option value="">— بدون گروه —</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)]">هیچ گروه فعالی برای این دوره یافت نشد.</p>
              )}
            </div>
          )}

          {/* Tuition / Discount / Final */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{fa.enrollments.tuition} (تومان) <span className="text-red-500">*</span></label>
              <input type="number" min={0} step={1} value={tuition} onChange={e => setTuition(e.target.value)} required className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>{fa.enrollments.discount} (تومان)</label>
              <input type="number" min={0} step={1} value={discount} onChange={e => setDiscount(e.target.value)} className={inputCls} placeholder="0" />
            </div>
          </div>

          {/* Final amount display */}
          <div className="rounded-lg bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">{fa.enrollments.finalAmount}</span>
            <span className="text-lg font-bold text-[var(--color-text-primary)]">
              {finalAmount.toLocaleString('fa-IR')} تومان
            </span>
          </div>

          {/* Enrollment date */}
          <div>
            <label className={labelCls}>{fa.enrollments.enrollmentDate} <span className="text-red-500">*</span></label>
            <input type="date" value={enrollmentDate} onChange={e => setEnrollmentDate(e.target.value)} required className={inputCls} />
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>{fa.enrollments.notes}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={2000} className={inputCls} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => router.back()}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]">
              انصراف
            </button>
            <button type="submit" disabled={loading || !studentId || !courseId || !tuition}
              className="rounded-lg bg-[var(--color-brand-600)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-700)] disabled:opacity-60">
              {loading ? 'در حال ثبت...' : 'ثبت ثبت‌نام'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NewEnrollmentPage() {
  return (
    <Suspense>
      <NewEnrollmentForm />
    </Suspense>
  )
}
