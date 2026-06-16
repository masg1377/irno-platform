'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { fa } from '@irno/i18n'
import { CourseGroupStatus } from '@irno/types'
import type { CourseDto, UserWithProfileDto } from '@irno/types'

export default function NewGroupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedCourseId = searchParams.get('courseId') ?? ''

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [courses, setCourses] = useState<CourseDto[]>([])
  const [teachers, setTeachers] = useState<UserWithProfileDto[]>([])
  const [mentors, setMentors] = useState<UserWithProfileDto[]>([])
  const [selectedMentors, setSelectedMentors] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      const [cRes, uRes] = await Promise.all([
        fetch('/api/v1/courses?status=ACTIVE&limit=100', { credentials: 'include' }),
        fetch('/api/v1/users?limit=200', { credentials: 'include' }),
      ])
      if (cRes.ok) {
        const j = await cRes.json() as { data: { data: CourseDto[] } }
        setCourses(j.data?.data ?? [])
      }
      if (uRes.ok) {
        const j = await uRes.json() as { data: { data: UserWithProfileDto[] } }
        const users: UserWithProfileDto[] = j.data?.data ?? []
        setTeachers(users.filter((u) => u.role === 'TEACHER'))
        setMentors(users.filter((u) => u.role === 'MENTOR'))
      }
    }
    void load()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {
      courseId: fd.get('courseId'),
      name: fd.get('name'),
      teacherId: fd.get('teacherId') || null,
      startDate: fd.get('startDate') || null,
      endDate: fd.get('endDate') || null,
      scheduleNotes: fd.get('scheduleNotes') || null,
      capacity: fd.get('capacity') ? Number(fd.get('capacity')) : null,
      status: fd.get('status'),
    }

    try {
      const res = await fetch('/api/v1/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const json = await res.json() as { data?: { id: string }; error?: { message: string[] | string } }
      if (!res.ok) {
        const msg = json.error?.message
        setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'خطا در ثبت گروه'))
        setLoading(false)
        return
      }
      const groupId = json.data!.id
      // Assign selected mentors
      for (const mentorId of selectedMentors) {
        await fetch(`/api/v1/groups/${groupId}/mentors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ mentorUserId: mentorId }),
        })
      }
      router.push(`/groups/${groupId}`)
    } catch {
      setError('خطا در اتصال به سرور')
      setLoading(false)
    }
  }

  function toggleMentor(id: string) {
    setSelectedMentors((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function userName(u: UserWithProfileDto): string {
    return u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u.mobile
  }

  const inputCls = "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
  const labelCls = "mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]"

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link href="/groups" className="hover:text-[var(--color-text-primary)]">{fa.groups.title}</Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{fa.groups.newGroup}</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">{fa.groups.newGroup}</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6">
        <div>
          <label className={labelCls}>{fa.groups.course} <span className="text-red-500">*</span></label>
          <select name="courseId" required defaultValue={preselectedCourseId} className={inputCls}>
            <option value="">انتخاب دوره...</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>{fa.groups.name} <span className="text-red-500">*</span></label>
          <input name="name" required className={inputCls} placeholder="مثال: گروه A ری‌اکت" />
        </div>

        <div>
          <label className={labelCls}>{fa.groups.teacher}</label>
          <select name="teacherId" className={inputCls}>
            <option value="">بدون مدرس</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{userName(t)}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{fa.groups.startDate}</label>
            <input name="startDate" type="date" className={inputCls} dir="ltr" />
          </div>
          <div>
            <label className={labelCls}>{fa.groups.endDate}</label>
            <input name="endDate" type="date" className={inputCls} dir="ltr" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{fa.groups.capacity}</label>
            <input name="capacity" type="number" min="1" className={inputCls} placeholder="مثال: 10" dir="ltr" />
          </div>
          <div>
            <label className={labelCls}>{fa.groups.status}</label>
            <select name="status" defaultValue={CourseGroupStatus.UPCOMING} className={inputCls}>
              {Object.values(CourseGroupStatus).map((s) => (
                <option key={s} value={s}>{fa.courseGroupStatus[s as keyof typeof fa.courseGroupStatus]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>{fa.groups.schedule}</label>
          <textarea name="scheduleNotes" rows={3} className={inputCls} placeholder="مثال: سه‌شنبه و پنج‌شنبه، ۱۸:۰۰–۲۰:۰۰" />
        </div>

        {mentors.length > 0 && (
          <div>
            <label className={labelCls}>{fa.groups.mentors}</label>
            <div className="flex flex-wrap gap-2">
              {mentors.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMentor(m.id)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    selectedMentors.includes(m.id)
                      ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)] dark:bg-[var(--color-brand-900)]/30 dark:text-[var(--color-brand-300)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'
                  }`}
                >
                  {userName(m)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="rounded-lg bg-[var(--color-brand-600)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {loading ? 'در حال ذخیره...' : 'ذخیره گروه'}
          </button>
          <Link href="/groups" className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]">
            {fa.ui.cancel}
          </Link>
        </div>
      </form>
    </div>
  )
}
