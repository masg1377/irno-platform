'use client'

import { useState, useEffect, useRef } from 'react'

// ── Types ───────────────────────────────────────────────────────────────────

type FindingSeverity = 'CRITICAL' | 'WARNING' | 'INFO' | 'PASS'
type FindingCategory =
  | 'ATS' | 'HR_SCAN' | 'STRUCTURE' | 'ACHIEVEMENT'
  | 'KEYWORD' | 'FORMATTING' | 'COMPLETENESS' | 'READABILITY' | 'ROLE_MATCH'
type ImpactLevel = 'HIGH' | 'MEDIUM' | 'LOW'
type SourceType = 'IRNO_RESUME' | 'UPLOADED_FILE' | 'PASTED_TEXT'
type TabId = 'irno' | 'upload' | 'paste' | 'job'

interface DetectedSectionInfo {
  type: string
  titleDetected: string
  confidence: number
  detectionMethod: string
  contentLength: number
}

interface ParserDiagnostics {
  detectedSections: DetectedSectionInfo[]
  extractedSkills: string[]
  warnings: string[]
  textLength: number
}

interface CheckFinding {
  id: string
  category: FindingCategory
  severity: FindingSeverity
  title: string
  message: string
  section?: string
  recommendation?: string
  affectedText?: string
  ruleCode: string
}

interface CheckSuggestion {
  priority: number
  category: FindingCategory
  title: string
  action: string
  impact: ImpactLevel
}

interface KeywordMatch {
  matched: string[]
  missing: string[]
  matchRate: number
}

interface CheckReport {
  id: string
  resumeDocumentId: string | null
  sourceType: SourceType
  sourceFileName: string | null
  targetRole: string | null
  overallScore: number
  atsScore: number
  hrScanScore: number
  structureScore: number
  keywordScore: number
  achievementScore: number
  formattingRiskScore: number
  completenessScore: number
  readabilityScore: number
  roleMatchScore: number | null
  findings: CheckFinding[]
  suggestions: CheckSuggestion[]
  keywordMatch: KeywordMatch | null
  diagnostics: ParserDiagnostics | null
  createdAt: string
}

interface CheckSummary {
  id: string
  resumeDocumentId: string | null
  sourceType: SourceType
  sourceFileName: string | null
  targetRole: string | null
  overallScore: number
  atsScore: number
  completenessScore: number
  findingCount: number
  criticalCount: number
  createdAt: string
}

interface ResumeOption {
  id: string
  title: string
}

// ── Score config ─────────────────────────────────────────────────────────────

const SCORE_LABELS: Record<string, string> = {
  atsScore: 'سازگاری با ATS',
  hrScanScore: 'نگاه سریع HR',
  structureScore: 'ساختار رزومه',
  keywordScore: 'کلمات کلیدی',
  achievementScore: 'کیفیت دستاوردها',
  formattingRiskScore: 'ریسک قالب‌بندی',
  completenessScore: 'کامل بودن رزومه',
  readabilityScore: 'خوانایی',
}

const SCORE_KEYS = [
  'atsScore', 'hrScanScore', 'structureScore', 'keywordScore',
  'achievementScore', 'formattingRiskScore', 'completenessScore', 'readabilityScore',
] as const

const CATEGORY_LABELS: Record<FindingCategory, string> = {
  ATS: 'سازگاری با ATS',
  HR_SCAN: 'اسکن HR',
  STRUCTURE: 'ساختار',
  ACHIEVEMENT: 'دستاوردها',
  KEYWORD: 'کلیدواژه',
  FORMATTING: 'قالب‌بندی',
  COMPLETENESS: 'کامل بودن',
  READABILITY: 'خوانایی',
  ROLE_MATCH: 'تطابق شغلی',
}

const SEVERITY_CONFIG: Record<FindingSeverity, { icon: string; color: string; bg: string; label: string }> = {
  CRITICAL: { icon: '⚠', color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',       label: 'مهم' },
  WARNING:  { icon: '!',  color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', label: 'هشدار' },
  INFO:     { icon: 'i',  color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',    label: 'اطلاعات' },
  PASS:     { icon: '✓',  color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800', label: 'موفق' },
}

const IMPACT_CONFIG: Record<ImpactLevel, { color: string; label: string }> = {
  HIGH:   { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',     label: 'تأثیر زیاد' },
  MEDIUM: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', label: 'تأثیر متوسط' },
  LOW:    { color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',    label: 'تأثیر کم' },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 80) return 'var(--color-success)'
  if (s >= 60) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

function scoreLabel(s: number) {
  if (s >= 80) return 'رزومه قوی است'
  if (s >= 60) return 'نیاز به بهبود دارد'
  return 'نیاز به بازنگری دارد'
}

function sectionLabel(sec: string): string {
  const labels: Record<string, string> = {
    SUMMARY: 'خلاصه', EXPERIENCE: 'تجربه', EDUCATION: 'تحصیلات',
    SKILL: 'مهارت‌ها', PROJECT: 'پروژه‌ها', CERTIFICATE: 'مدارک',
    LANGUAGE: 'زبان‌ها', LINK: 'لینک‌ها',
  }
  return labels[sec] ?? sec
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fa-IR', { year: 'numeric', month: 'short', day: 'numeric' })
}

function groupFindings(findings: CheckFinding[]) {
  const groups: Record<string, CheckFinding[]> = {}
  for (const f of findings) {
    if (!groups[f.category]) groups[f.category] = []
    groups[f.category]!.push(f)
  }
  // Sort groups: CRITICAL first
  const order: FindingCategory[] = ['ATS', 'COMPLETENESS', 'HR_SCAN', 'ACHIEVEMENT', 'STRUCTURE', 'KEYWORD', 'FORMATTING', 'READABILITY', 'ROLE_MATCH']
  return order.filter((cat) => groups[cat]).map((cat) => ({ category: cat, findings: groups[cat]! }))
}

// ── Source type badge ─────────────────────────────────────────────────────────

function SourceBadge({ type, fileName }: { type: SourceType; fileName: string | null }) {
  const labels: Record<SourceType, string> = {
    IRNO_RESUME: 'ایرنو CV',
    UPLOADED_FILE: `فایل: ${fileName ?? ''}`,
    PASTED_TEXT: 'متن وارد‌شده',
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-700)] dark:bg-[var(--color-brand-900)]/40 dark:text-[var(--color-brand-300)] px-2 py-0.5 text-xs font-medium">
      {labels[type]}
    </span>
  )
}

// ── Score circle ──────────────────────────────────────────────────────────────

function ScoreCircle({ score, size = 88 }: { score: number; size?: number }) {
  const r = (size / 2) - 8
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = scoreColor(score)

  return (
    <svg width={size} height={size} className="shrink-0" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-bg-subtle)" strokeWidth="6" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text
        x={size / 2} y={size / 2 + 5}
        textAnchor="middle"
        fontSize={size > 70 ? 20 : 14}
        fontWeight="700"
        fill={color}
        style={{ transform: `rotate(90deg) translateX(0) translateY(-${size}px)` }}
      >
        {score}
      </text>
    </svg>
  )
}

// ── Loading spinner ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="h-10 w-10 rounded-full border-4 border-[var(--color-brand-600)] border-t-transparent animate-spin" />
      <p className="text-sm text-[var(--color-text-muted)]">در حال تحلیل رزومه...</p>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CheckerPage() {
  const [tab, setTab] = useState<TabId>('irno')
  const [resumes, setResumes] = useState<ResumeOption[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [jobDesc, setJobDesc] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [jobResumeMode, setJobResumeMode] = useState<'irno' | 'paste'>('irno')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CheckReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<CheckSummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<'findings' | 'suggestions' | 'keywords' | 'diagnostics' | 'history'>('findings')
  const [filterSeverity, setFilterSeverity] = useState<FindingSeverity | 'ALL'>('ALL')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Pre-select resumeId from URL param
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const rid = params.get('resumeId')
    if (rid) { setSelectedId(rid); setTab('irno') }
    const t = params.get('tab') as TabId | null
    if (t && ['irno','upload','paste','job'].includes(t)) setTab(t)
  }, [])

  // Load resume list
  useEffect(() => {
    fetch('/api/v1/career/resumes?pageSize=50')
      .then((r) => r.json())
      .then((d) => {
        const list = d?.data?.data ?? d?.data ?? []
        setResumes(list.map((r: any) => ({ id: r.id, title: r.title })))
      })
      .catch(() => {})
  }, [])

  // Load history
  useEffect(() => {
    setHistoryLoading(true)
    fetch('/api/v1/career/checker/reports?pageSize=20')
      .then((r) => r.json())
      .then((d) => {
        const items = d?.data?.data ?? d?.data ?? []
        setHistory(items)
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }, [result]) // reload after each check

  async function runCheck() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      let res: Response

      if (tab === 'irno') {
        if (!selectedId) { setError('رزومه‌ای انتخاب نشده است.'); return }
        res = await fetch(`/api/v1/career/resumes/${selectedId}/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetRole: targetRole || undefined, jobDescription: jobDesc || undefined }),
        })
      } else if (tab === 'job') {
        if (!jobDesc.trim()) { setError('متن آگهی شغلی را وارد کنید.'); return }
        if (jobResumeMode === 'irno') {
          if (!selectedId) { setError('رزومه‌ای انتخاب نشده است.'); return }
          res = await fetch(`/api/v1/career/resumes/${selectedId}/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetRole: targetRole || undefined, jobDescription: jobDesc }),
          })
        } else {
          if (!pasteText.trim()) { setError('متن رزومه وارد نشده است.'); return }
          res = await fetch('/api/v1/career/checker/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resumeText: pasteText, targetRole: targetRole || undefined, jobDescription: jobDesc }),
          })
        }
      } else if (tab === 'paste') {
        if (!pasteText.trim()) { setError('متن رزومه وارد نشده است.'); return }
        res = await fetch('/api/v1/career/checker/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resumeText: pasteText,
            targetRole: targetRole || undefined,
            jobDescription: jobDesc || undefined,
          }),
        })
      } else {
        // upload
        if (!uploadFile) { setError('فایلی انتخاب نشده است.'); return }
        const form = new FormData()
        form.append('file', uploadFile)
        if (targetRole) form.append('targetRole', targetRole)
        if (jobDesc) form.append('jobDescription', jobDesc)
        res = await fetch('/api/v1/career/checker/upload', { method: 'POST', body: form })
      }

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d?.message ?? 'خطا در اجرای بررسی.')
        return
      }

      const d = await res.json()
      const report = d?.data ?? d
      setResult(report)
      setActiveSection('findings')
    } catch {
      setError('خطا در اتصال به سرور.')
    } finally {
      setLoading(false)
    }
  }

  const filteredFindings = result
    ? (filterSeverity === 'ALL'
        ? result.findings
        : result.findings.filter((f) => f.severity === filterSeverity)
      )
    : []

  const groupedFindings = groupFindings(filteredFindings)
  const criticalCount = result?.findings.filter((f) => f.severity === 'CRITICAL').length ?? 0
  const warningCount = result?.findings.filter((f) => f.severity === 'WARNING').length ?? 0
  const passCount = result?.findings.filter((f) => f.severity === 'PASS').length ?? 0

  return (
    <div className="space-y-6 max-w-4xl" dir="rtl">

      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-brand-600)] text-white font-bold text-sm">
            ✓
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">بررسی رزومه</h1>
            <p className="text-xs text-[var(--color-text-muted)]">تحلیل پیشرفته ATS، HR، ساختار، کلیدواژه و دستاوردها</p>
          </div>
        </div>
      </div>

      {/* ── Input Panel ── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden">

        {/* Tabs */}
        <div className="flex border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
          {([
            { id: 'irno',   label: 'رزومه ایرنو',         icon: '📄' },
            { id: 'upload', label: 'آپلود فایل',          icon: '⬆' },
            { id: 'paste',  label: 'چسباندن متن',         icon: '📋' },
            { id: 'job',    label: 'با آگهی شغلی',        icon: '🎯' },
          ] as { id: TabId; label: string; icon: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                tab === t.id
                  ? 'border-[var(--color-brand-600)] text-[var(--color-brand-600)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
              ].join(' ')}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Input area */}
        <div className="p-5 space-y-4">

          {/* Irno resume selector */}
          {tab === 'irno' && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5">
                انتخاب رزومه
              </label>
              {resumes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--color-border)] p-4 text-center text-sm text-[var(--color-text-muted)]">
                  هنوز رزومه‌ای نساخته‌اید.{' '}
                  <a href="/resumes/new" className="text-[var(--color-brand-600)] hover:underline">رزومه بسازید</a>
                </div>
              ) : (
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
                >
                  <option value="">— رزومه را انتخاب کنید —</option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Upload */}
          {tab === 'upload' && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5">
                فایل رزومه (PDF یا TXT)
              </label>
              <div
                className="rounded-lg border-2 border-dashed border-[var(--color-border)] p-6 text-center cursor-pointer hover:border-[var(--color-brand-600)] transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadFile ? (
                  <div className="space-y-1">
                    <div className="text-2xl">📄</div>
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">{uploadFile.name}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{(uploadFile.size / 1024).toFixed(1)} KB</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setUploadFile(null) }}
                      className="text-xs text-[var(--color-danger)] hover:underline"
                    >
                      حذف
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-3xl text-[var(--color-text-muted)]">⬆</div>
                    <div className="text-sm text-[var(--color-text-muted)]">فایل را اینجا رها کنید یا کلیک کنید</div>
                    <div className="text-xs text-[var(--color-text-muted)]">PDF یا TXT — حداکثر ۲۰۰ کیلوبایت</div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
              <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
                فقط PDF‌های متنی (قابل انتخاب) پشتیبانی می‌شوند. PDF اسکن‌شده کار نمی‌کند.
              </p>
            </div>
          )}

          {/* Job tab: source toggle + JD */}
          {tab === 'job' && (
            <>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setJobResumeMode('irno')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${jobResumeMode === 'irno' ? 'bg-[var(--color-brand-600)] text-white border-[var(--color-brand-600)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-brand-600)]'}`}
                >
                  📄 رزومه ایرنو
                </button>
                <button
                  onClick={() => setJobResumeMode('paste')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${jobResumeMode === 'paste' ? 'bg-[var(--color-brand-600)] text-white border-[var(--color-brand-600)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-brand-600)]'}`}
                >
                  📋 چسباندن متن
                </button>
              </div>
              {jobResumeMode === 'irno' ? (
                <div>
                  {resumes.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[var(--color-border)] p-4 text-center text-sm text-[var(--color-text-muted)]">
                      هنوز رزومه‌ای نساخته‌اید. <a href="/resumes/new" className="text-[var(--color-brand-600)] hover:underline">رزومه بسازید</a>
                    </div>
                  ) : (
                    <select
                      value={selectedId}
                      onChange={(e) => setSelectedId(e.target.value)}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
                    >
                      <option value="">— رزومه را انتخاب کنید —</option>
                      {resumes.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                    </select>
                  )}
                </div>
              ) : (
                <div>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="متن رزومه را اینجا بچسبانید..."
                    rows={6}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
                  />
                  <div className="text-xs text-[var(--color-text-muted)] mt-1">{pasteText.split(/\s+/).filter(Boolean).length} کلمه</div>
                </div>
              )}
            </>
          )}

          {/* Paste text */}
          {tab === 'paste' && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5">
                متن رزومه
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="متن رزومه را اینجا بچسبانید..."
                rows={8}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
              />
              <div className="text-xs text-[var(--color-text-muted)] mt-1">
                {pasteText.split(/\s+/).filter(Boolean).length} کلمه
              </div>
            </div>
          )}

          {/* Optional fields: targetRole + job desc */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                موقعیت هدف (اختیاری)
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="مثال: Frontend Developer"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
              />
            </div>
          </div>

          {/* Job description — required on job tab, optional on others */}
          {tab === 'job' && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-brand-600)] uppercase tracking-wide mb-1">
                متن آگهی شغلی <span className="text-red-500">*</span>
              </label>
              <textarea
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
                placeholder="متن آگهی شغلی را اینجا کپی کنید... (حداقل ۵۰ کلمه برای تحلیل دقیق)"
                rows={6}
                className="w-full rounded-lg border border-[var(--color-brand-600)]/40 bg-[var(--color-bg-subtle)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {jobDesc.split(/\s+/).filter(Boolean).length} کلمه
                {jobDesc.trim().length > 0 && ' — تطابق کلیدواژه با رزومه محاسبه می‌شود'}
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={runCheck}
            disabled={loading}
            className="flex items-center gap-2 bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                در حال بررسی...
              </>
            ) : (
              <>
                <span>✓</span>
                اجرای بررسی
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && <Spinner />}

      {/* ── Results ── */}
      {result && !loading && (
        <div className="space-y-5 animate-[fadeIn_0.3s_ease]">

          {/* Score overview */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

              {/* Big circle */}
              <div className="flex flex-col items-center gap-2">
                <ScoreCircle score={result.overallScore} size={100} />
                <div className="text-center">
                  <div className="text-xs font-medium text-[var(--color-text-primary)]">امتیاز کلی</div>
                  <div className="text-xs text-[var(--color-text-muted)]" style={{ color: scoreColor(result.overallScore) }}>
                    {scoreLabel(result.overallScore)}
                  </div>
                </div>
              </div>

              {/* Score bars */}
              <div className="flex-1 w-full space-y-2.5">
                {SCORE_KEYS.map((key) => {
                  const score = (result as any)[key] as number
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className="w-28 shrink-0 text-xs text-[var(--color-text-secondary)] truncate">
                        {SCORE_LABELS[key]}
                      </div>
                      <div className="flex-1 h-2 rounded-full bg-[var(--color-bg-subtle)] overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${score}%`, background: scoreColor(score) }}
                        />
                      </div>
                      <div className="w-8 text-right text-xs font-semibold shrink-0" style={{ color: scoreColor(score) }}>
                        {score}
                      </div>
                    </div>
                  )
                })}
                {result.roleMatchScore !== null && (
                  <div className="flex items-center gap-3">
                    <div className="w-28 shrink-0 text-xs text-[var(--color-text-secondary)] truncate">
                      تطابق با آگهی
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-[var(--color-bg-subtle)] overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${result.roleMatchScore}%`, background: scoreColor(result.roleMatchScore) }}
                      />
                    </div>
                    <div className="w-8 text-right text-xs font-semibold shrink-0" style={{ color: scoreColor(result.roleMatchScore) }}>
                      {result.roleMatchScore}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Meta row */}
            <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)]">
              <SourceBadge type={result.sourceType} fileName={result.sourceFileName} />
              {result.targetRole && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-bg-subtle)] px-2 py-0.5 border border-[var(--color-border)]">
                  🎯 {result.targetRole}
                </span>
              )}
              <span className="mr-auto">{formatDate(result.createdAt)}</span>
              <div className="flex items-center gap-3">
                <span className="text-red-600 dark:text-red-400 font-medium">{criticalCount} مهم</span>
                <span className="text-amber-600 dark:text-amber-400">{warningCount} هشدار</span>
                <span className="text-green-600 dark:text-green-400">{passCount} موفق</span>
              </div>
            </div>
          </div>

          {/* Detected sections chips — shown for non-Irno sources */}
          {result.sourceType !== 'IRNO_RESUME' && (() => {
            const SECTION_ICONS: Record<string, string> = {
              SUMMARY: '📝', EXPERIENCE: '💼', EDUCATION: '🎓', SKILL: '⚡',
              PROJECT: '🚀', CERTIFICATE: '🏅', LANGUAGE: '🌐', LINK: '🔗',
            }
            // Extract detected sections from PASS completeness findings
            const detected = result.findings
              .filter((f) => f.severity === 'PASS' && f.section && SECTION_ICONS[f.section])
              .map((f) => f.section!)
              .filter((v, i, a) => a.indexOf(v) === i)
            const missing = result.findings
              .filter((f) => (f.severity === 'CRITICAL' || f.severity === 'WARNING') && f.ruleCode?.startsWith('CMP_MISSING_'))
              .map((f) => f.section)
              .filter((v): v is string => !!v && !!SECTION_ICONS[v])
              .filter((v, i, a) => a.indexOf(v) === i)
            if (detected.length === 0 && missing.length === 0) return null
            return (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
                <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-3">بخش‌های شناسایی‌شده</div>
                <div className="flex flex-wrap gap-2">
                  {detected.map((sec) => (
                    <span key={sec} className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-2.5 py-1 text-xs text-green-700 dark:text-green-400">
                      {SECTION_ICONS[sec]} {sectionLabel(sec)} ✓
                    </span>
                  ))}
                  {missing.map((sec) => (
                    <span key={sec} className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-2.5 py-1 text-xs text-red-600 dark:text-red-400">
                      {SECTION_ICONS[sec]} {sectionLabel(sec)} ✗
                    </span>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Section navigation */}
          <div className="flex gap-2 flex-wrap">
            {([
              { id: 'findings',    label: `یافته‌ها (${result.findings.length})` },
              { id: 'suggestions', label: `پیشنهادها (${result.suggestions.length})` },
              ...(result.keywordMatch ? [{ id: 'keywords', label: 'کلیدواژه‌ها' }] : []),
              ...(result.diagnostics ? [{ id: 'diagnostics', label: 'تشخیص پارسر' }] : []),
              { id: 'history',     label: 'تاریخچه' },
            ] as { id: typeof activeSection; label: string }[]).map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={[
                  'rounded-lg px-4 py-2 text-sm font-medium transition-colors border',
                  activeSection === s.id
                    ? 'bg-[var(--color-brand-600)] text-white border-[var(--color-brand-600)]'
                    : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-brand-600)]',
                ].join(' ')}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* ── Findings Panel ── */}
          {activeSection === 'findings' && (
            <div className="space-y-4">
              {/* Severity filter */}
              <div className="flex gap-2 flex-wrap">
                {(['ALL', 'CRITICAL', 'WARNING', 'INFO', 'PASS'] as const).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setFilterSeverity(sev)}
                    className={[
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      filterSeverity === sev
                        ? 'bg-[var(--color-brand-600)] text-white'
                        : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]',
                    ].join(' ')}
                  >
                    {sev === 'ALL' ? 'همه' : SEVERITY_CONFIG[sev as FindingSeverity]?.label}
                  </button>
                ))}
              </div>

              {groupedFindings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
                  هیچ یافته‌ای در این دسته وجود ندارد.
                </div>
              ) : (
                groupedFindings.map(({ category, findings }) => (
                  <div key={category} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]">
                      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {CATEGORY_LABELS[category as FindingCategory]}
                      </h3>
                      <span className="text-xs text-[var(--color-text-muted)]">{findings.length} مورد</span>
                    </div>
                    <div className="divide-y divide-[var(--color-border)]">
                      {findings.map((f) => {
                        const cfg = SEVERITY_CONFIG[f.severity]
                        return (
                          <div key={f.id} className={`px-4 py-3.5 flex items-start gap-3 ${cfg.bg} border-0`}>
                            <div
                              className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${cfg.color}`}
                              style={{ background: 'transparent', border: `1.5px solid currentColor` }}
                            >
                              {cfg.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                                {f.section && (
                                  <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">
                                    {f.section}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-medium text-[var(--color-text-primary)] mt-0.5">{f.title}</p>
                              <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{f.message}</p>
                              {f.recommendation && (
                                <p className="text-xs text-[var(--color-text-muted)] mt-1.5 flex items-start gap-1">
                                  <span className="shrink-0 mt-0.5">💡</span>
                                  {f.recommendation}
                                </p>
                              )}
                              {f.affectedText && (
                                <code className="mt-1.5 block text-xs bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-text-muted)] truncate max-w-full">
                                  «{f.affectedText}»
                                </code>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Suggestions Panel ── */}
          {activeSection === 'suggestions' && (
            <div className="space-y-3">
              {result.suggestions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
                  هیچ پیشنهادی وجود ندارد.
                </div>
              ) : (
                result.suggestions.map((s, i) => {
                  const impactCfg = IMPACT_CONFIG[s.impact]
                  return (
                    <div
                      key={i}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 flex items-start gap-4"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white text-sm font-bold">
                        {s.priority}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{s.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${impactCfg.color}`}>
                            {impactCfg.label}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {CATEGORY_LABELS[s.category]}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1">{s.action}</p>
                      </div>
                    </div>
                  )
                })
              )}
              <p className="text-xs text-[var(--color-text-muted)] text-center pt-2">
                این امتیازها راهنمای بهبود هستند، نه ضمانت استخدام.
              </p>
            </div>
          )}

          {/* ── Keyword Panel ── */}
          {activeSection === 'keywords' && result.keywordMatch && (
            <div className="space-y-4">
              {/* Match rate */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
                <div className="flex items-center gap-5">
                  <ScoreCircle score={result.keywordMatch.matchRate} size={80} />
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-text-primary)]">نرخ تطابق کلیدواژه</div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {result.keywordMatch.matched.length} کلیدواژه پیدا شد —{' '}
                      {result.keywordMatch.missing.length} کلیدواژه غایب
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Matched */}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
                  <h3 className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-3">
                    ✓ کلیدواژه‌های موجود ({result.keywordMatch.matched.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.keywordMatch.matched.slice(0, 30).map((kw) => (
                      <span key={kw} className="text-xs bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-full px-2 py-0.5">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Missing */}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
                  <h3 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-3">
                    ✗ کلیدواژه‌های غایب ({result.keywordMatch.missing.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.keywordMatch.missing.slice(0, 30).map((kw) => (
                      <span key={kw} className="text-xs bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-full px-2 py-0.5">
                        {kw}
                      </span>
                    ))}
                  </div>
                  {result.keywordMatch.missing.length > 0 && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-3">
                      💡 اگر با این مهارت‌ها آشنا هستید، آن‌ها را به بخش مهارت‌ها یا تجربه کاری اضافه کنید.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Diagnostics Panel ── */}
          {activeSection === 'diagnostics' && result.diagnostics && (
            <DiagnosticsPanel diagnostics={result.diagnostics} sourceType={result.sourceType} />
          )}

          {/* ── History Panel ── */}
          {activeSection === 'history' && (
            <HistoryPanel history={history} loading={historyLoading} />
          )}
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-10 text-center">
            <div className="text-4xl mb-3">📊</div>
            <div className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">آماده بررسی رزومه</div>
            <div className="text-xs text-[var(--color-text-muted)]">
              رزومه ایرنو خود را انتخاب کنید یا متن رزومه را بچسبانید تا تحلیل کامل دریافت کنید.
            </div>
          </div>

          {/* Recent history below empty state */}
          {history.length > 0 && (
            <HistoryPanel history={history} loading={historyLoading} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Diagnostics Panel Component ──────────────────────────────────────────────

const SECTION_ICONS: Record<string, string> = {
  SUMMARY: '📝', EXPERIENCE: '💼', EDUCATION: '🎓', SKILL: '⚡',
  PROJECT: '🚀', CERTIFICATE: '🏅', LANGUAGE: '🌐', LINK: '🔗',
}

const METHOD_LABELS: Record<string, string> = {
  ALIAS:           'عنوان شناخته‌شده',
  CONTENT_PATTERN: 'الگوی محتوا',
  POSITIONAL:      'موقعیت در متن',
  KEYWORD:         'کلیدواژه',
}

function confidenceColor(c: number) {
  if (c >= 80) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
  if (c >= 60) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
  return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
}

function DiagnosticsPanel({ diagnostics, sourceType }: { diagnostics: ParserDiagnostics; sourceType: SourceType }) {
  const [showSkills, setShowSkills] = useState(false)

  // Diagnostics are only meaningful for text/upload sources
  const isIrno = sourceType === 'IRNO_RESUME'

  return (
    <div className="space-y-4">

      {/* Header note */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl shrink-0">🔍</span>
          <div>
            <div className="text-sm font-semibold text-[var(--color-text-primary)] mb-0.5">اطلاعات تشخیص پارسر</div>
            <p className="text-xs text-[var(--color-text-muted)]">
              {isIrno
                ? 'رزومه ایرنو از بخش‌های ساختاریافته تشکیل شده است. نتایج پارسر برای این منبع نمایشی است.'
                : `متن رزومه (${diagnostics.textLength.toLocaleString('fa-IR')} کاراکتر) توسط موتور پارسر تحلیل شد. نتایج زیر نشان می‌دهد کدام بخش‌ها با چه اطمینانی تشخیص داده شدند.`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Detected sections */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden">
        <div className="px-4 py-3 bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            بخش‌های تشخیص‌داده‌شده ({diagnostics.detectedSections.length})
          </h3>
        </div>

        {diagnostics.detectedSections.length === 0 ? (
          <div className="p-6 text-center text-sm text-[var(--color-text-muted)]">
            بخشی تشخیص داده نشد.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {diagnostics.detectedSections.map((sec, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                {/* Section icon */}
                <span className="text-xl shrink-0 w-7 text-center">
                  {SECTION_ICONS[sec.type] ?? '📄'}
                </span>

                {/* Section type + detected title */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      {sec.type}
                    </span>
                    {sec.titleDetected && sec.titleDetected !== '(inferred)' && sec.titleDetected !== '(pattern)' && sec.titleDetected !== '(grouped labels)' && (
                      <span className="text-xs text-[var(--color-text-muted)] truncate max-w-[160px]">
                        «{sec.titleDetected}»
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {METHOD_LABELS[sec.detectionMethod] ?? sec.detectionMethod}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">·</span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {sec.contentLength.toLocaleString('fa-IR')} کاراکتر
                    </span>
                  </div>
                </div>

                {/* Confidence badge */}
                <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${confidenceColor(sec.confidence)}`}>
                  {sec.confidence}٪
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Parser warnings */}
      {diagnostics.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-2">
          <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
            هشدارهای پارسر ({diagnostics.warnings.length})
          </div>
          {diagnostics.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
              <span className="shrink-0 mt-0.5">⚠</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Extracted skills */}
      {diagnostics.extractedSkills.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
          <button
            onClick={() => setShowSkills((v) => !v)}
            className="flex items-center justify-between w-full text-right"
          >
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
              مهارت‌های استخراج‌شده ({diagnostics.extractedSkills.length})
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">{showSkills ? '▲' : '▼'}</span>
          </button>
          {showSkills && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {diagnostics.extractedSkills.map((skill) => (
                <span
                  key={skill}
                  className="text-xs bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)]/30 text-[var(--color-brand-700)] dark:text-[var(--color-brand-300)] border border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)] rounded-full px-2 py-0.5"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-[var(--color-text-muted)] text-center">
        اطلاعان تشخیص برای عیب‌یابی و بهبود دقت رزومه‌خوان است. این تشخیص‌ها مستقیماً روی امتیازها تأثیر می‌گذارند.
      </p>
    </div>
  )
}

// ── History Panel Component ──────────────────────────────────────────────────

function HistoryPanel({ history, loading }: { history: CheckSummary[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6 text-center text-sm text-[var(--color-text-muted)]">
        در حال بارگذاری تاریخچه...
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6 text-center">
        <div className="text-2xl mb-2">📂</div>
        <div className="text-sm text-[var(--color-text-muted)]">هنوز بررسی انجام نداده‌اید.</div>
      </div>
    )
  }

  const sourceLabels: Record<string, string> = {
    IRNO_RESUME: 'ایرنو CV',
    UPLOADED_FILE: 'فایل',
    PASTED_TEXT: 'متن',
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden">
      <div className="px-4 py-3 bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          تاریخچه بررسی‌ها ({history.length})
        </h3>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {history.map((item) => (
          <div key={item.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--color-bg-subtle)] transition-colors">
            {/* Score circle mini */}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold"
              style={{ borderColor: scoreColor(item.overallScore), color: scoreColor(item.overallScore) }}
            >
              {item.overallScore}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[var(--color-text-muted)]">
                  {sourceLabels[item.sourceType] ?? item.sourceType}
                </span>
                {item.targetRole && (
                  <span className="text-xs text-[var(--color-text-muted)] truncate max-w-[120px]">
                    🎯 {item.targetRole}
                  </span>
                )}
                {item.criticalCount > 0 && (
                  <span className="text-xs text-red-600 dark:text-red-400">{item.criticalCount} مهم</span>
                )}
              </div>
              <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {new Date(item.createdAt).toLocaleDateString('fa-IR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <div className="text-xs text-[var(--color-text-muted)] shrink-0">
              {item.findingCount} مورد
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
