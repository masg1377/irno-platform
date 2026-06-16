import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCourse, getCourseGroups } from '@/lib/api'
import { fa } from '@irno/i18n'
import { CourseEditForm } from './course-actions'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const course = await getCourse(id)
  return { title: course?.title ?? 'دوره' }
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { id } = await params
  const [course, groupsResult] = await Promise.all([
    getCourse(id),
    getCourseGroups({ courseId: id, limit: 50 }),
  ])
  if (!course) notFound()

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link href="/courses" className="hover:text-[var(--color-text-primary)]">{fa.courses.title}</Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)]">{course.title}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{course.title}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              course.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
              : course.status === 'ARCHIVED' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
              : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]'
            }`}>
              {fa.courseStatus[course.status as keyof typeof fa.courseStatus] ?? course.status}
            </span>
          </div>
          <div className="mt-1 font-mono text-sm text-[var(--color-text-muted)]" dir="ltr">{course.slug}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Course info */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">اطلاعات دوره</h2>
            <InfoRow label="دسته‌بندی" value={course.category ?? "—"} />
            <InfoRow label="سطح" value={fa.courseLevel[course.level as keyof typeof fa.courseLevel] ?? course.level} />
            <InfoRow
              label="شهریه پیش‌فرض"
              value={course.defaultTuitionToman !== null ? `${course.defaultTuitionToman.toLocaleString('fa-IR')} تومان` : '—'}
              dir="ltr"
            />
            <InfoRow label="تعداد گروه‌ها" value={String(course.groupCount ?? 0)} />
          </div>

          {course.description && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
              <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">{fa.courses.description}</h2>
              <p className="whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">{course.description}</p>
            </div>
          )}

          {/* Groups */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">گروه‌های آموزشی</h2>
              <Link
                href={`/groups/new?courseId=${course.id}`}
                className="rounded-lg bg-[var(--color-brand-600)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-brand-700)]"
              >
                + ایجاد گروه
              </Link>
            </div>
            {groupsResult.data.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">{fa.groups.noGroups}</p>
            ) : (
              <ul className="space-y-2">
                {groupsResult.data.map((g) => (
                  <li key={g.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-2.5">
                    <div>
                      <Link href={`/groups/${g.id}`} className="text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-brand-600)]">
                        {g.name}
                      </Link>
                      {g.teacherName && <span className="mr-2 text-xs text-[var(--color-text-muted)]">مدرس: {g.teacherName}</span>}
                    </div>
                    <span className={`text-xs ${g.status === 'ACTIVE' ? 'text-green-600' : 'text-[var(--color-text-muted)]'}`}>
                      {fa.courseGroupStatus[g.status as keyof typeof fa.courseGroupStatus] ?? g.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <CourseEditForm course={course} />
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, dir }: { label: string; value: string; dir?: 'ltr' | 'rtl' }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] py-2 last:border-0">
      <span className="shrink-0 text-sm text-[var(--color-text-muted)]">{label}</span>
      <span className="text-sm text-[var(--color-text-primary)]" dir={dir}>{value}</span>
    </div>
  )
}
