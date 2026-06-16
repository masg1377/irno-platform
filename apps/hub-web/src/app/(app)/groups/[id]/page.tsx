import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCourseGroup, getGroupMeetinoReference, getGroupMeetinoAttendance, getMe } from '@/lib/api'
import { fa } from '@irno/i18n'
import { CourseGroupStatus } from '@irno/types'
import GroupActions from './group-actions'
import MeetinoTab from './meetino-tab'

interface Props {
  params: Promise<{ id: string }>
}

const statusColors: Record<CourseGroupStatus, string> = {
  UPCOMING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  COMPLETED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fa-IR')
}

export default async function GroupDetailPage({ params }: Props) {
  const { id } = await params

  const [group, me, meetinoRef, attendance] = await Promise.all([
    getCourseGroup(id),
    getMe(),
    getGroupMeetinoReference(id),
    getGroupMeetinoAttendance(id),
  ])

  if (!group) notFound()

  const meetinoWebUrl = process.env['MEETINO_WEB_URL']

  return (
    <div className="space-y-6" dir="rtl">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
        <Link href="/groups" className="hover:text-gray-700 dark:hover:text-gray-200">
          {fa.nav.groups}
        </Link>
        <span>/</span>
        <span className="text-gray-800 dark:text-gray-200">{group.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{group.name}</h1>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusColors[group.status]}`}>
              {fa.courseGroupStatus[group.status]}
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            دوره:{' '}
            <Link href={`/courses/${group.courseId}`} className="text-blue-600 hover:underline dark:text-blue-400">
              {group.courseName}
            </Link>
          </p>
        </div>
        <GroupActions group={group} />
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <InfoCard label="مدرس" value={group.teacherName ?? '—'} />
        <InfoCard label="تاریخ شروع" value={formatDate(group.startDate)} />
        <InfoCard label="تاریخ پایان" value={formatDate(group.endDate)} />
        <InfoCard label="ظرفیت" value={group.capacity ? `${group.capacity} نفر` : '—'} />
        <InfoCard
          label="منتورها"
          value={
            group.mentors.length > 0
              ? group.mentors.map((m) => m.name).join('، ')
              : '—'
          }
        />
        {group.scheduleNotes && (
          <InfoCard label="برنامه زمانی" value={group.scheduleNotes} />
        )}
      </div>

      {/* Tabs */}
      <GroupTabs
        groupId={id}
        meetinoRef={meetinoRef}
        attendance={attendance}
        userRole={me?.role ?? 'ADMIN'}
        meetinoWebUrl={meetinoWebUrl}
      />
    </div>
  )
}

function GroupTabs({ groupId, meetinoRef, attendance, userRole, meetinoWebUrl }: {
  groupId: string
  meetinoRef: Awaited<ReturnType<typeof getGroupMeetinoReference>>
  attendance: Awaited<ReturnType<typeof getGroupMeetinoAttendance>>
  userRole: string
  meetinoWebUrl?: string
}) {
  return (
    <div className="mt-8">
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex gap-6 text-sm font-medium overflow-x-auto">
          <span className="pb-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">دانشجویان</span>
          <span className="pb-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">پرداخت‌ها</span>
          <span className="pb-2 border-b-2 border-blue-600 text-blue-600 whitespace-nowrap">
            جلسات میتینو
          </span>
        </div>
      </div>

      <MeetinoTab
        groupId={groupId}
        initialReference={meetinoRef}
        initialAttendance={attendance}
        userRole={userRole}
        meetinoWebUrl={meetinoWebUrl}
      />
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}
