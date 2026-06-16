'use client'

import { useState, useEffect, useRef } from 'react'
import type { JobMatchReportDto } from '@irno/types'

// ── Types ──────────────────────────────────────────────────────────────────

interface ResumeOption {
  id: string
  title: string
}

type SourceMode = 'irno' | 'upload' | 'paste'

// ── Helpers ────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score === null) return 'var(--color-text-muted)'
  if (score >= 75) return 'var(--color-success, #16a34a)'
  if (score >= 50) return 'var(--color-warning, #d97706)'
  return 'var(--color-danger, #dc2626)'
}

function scoreLabel(score: number | null): string {
  if (score === null) return '—'
  if (score >= 75) return 'عالی'
  if (score >= 50) return 'متوسط'
  return 'ضعیف'
}

function sourceLabel(sourceType: string): string {
  if (sourceType === 'UPLOADED_FILE') return '📄 فایل آپلودشده'
  if (sourceType === 'PASTED_TEXT') return '📝 متن چسبانده‌شده'
  return '🗂 رزومه ایرنو'
}

// ── Component ──────────────────────────────────────────────────────────────

export default function JobMatchPage() {
  // Data
  const [resumes, setResumes] = useState<ResumeOption[]>([])
  const [pastReports, setPastReports] = useState<JobMatchReportDto[]>([])

  // Mode
  const [mode, setMode] = useState<SourceMode>('irno')

  // Form state
  const [selectedResumeId, setSelectedResumeId] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [jobTitle, setJobTitle] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // UI state
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<JobMatchReportDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  // Load resumes and past reports on mount
  useEffect(() => {
    fetch('/api/v1/career/resumes?pageSize=50')
      .then((r) => r.json())
      .then((d) => {
        const list = d?.data?.data ?? d?.data ?? []
        setResumes(list.map((r: { id: string; title: string }) => ({ id: r.id, title: r.title })))
      })
      .catch(() => {})

    fetch('/api/v1/career/job-match')
      .then((r) => r.json())
      .then((d) => {
        const rows = Array.isArray(d?.data?.data) ? d.data.data
          : Array.isArray(d?.data) ? d.data
          : []
        setPastReports(rows)
      })
      .catch(() => {})
  }, [])

  // ── File handling ──────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null)
    const file = e.target.files?.[0] ?? null
    if (!file) {
      setUploadedFile(null)
      return
    }

    // Client-side validation
    const name = file.name.toLowerCase()
    if (!name.endsWith('.pdf') && !name.endsWith('.txt')) {
      setFileError('فقط فایل PDF یا TXT پشتیبانی می‌شود.')
      setUploadedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (file.size > 5_000_000) {
      setFileError('حجم فایل نباید از ۵ مگابایت بیشتر باشد.')
      setUploadedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploadedFile(file)
  }

  function clearFile() {
    setUploadedFile(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)

    // Validate job description (common for all modes)
    const jd = jobDescription.trim()
    if (jd.length < 30) {
      setError('شرح موقعیت شغلی باید حداقل ۳۰ کاراکتر باشد.')
      return
    }

    // Mode-specific validation
    if (mode === 'paste') {
      if (pastedText.trim().length < 30) {
        setError('متن رزومه باید حداقل ۳۰ کاراکتر داشته باشد.')
        return
      }
    } else if (mode === 'upload') {
      if (!uploadedFile) {
        setError('لطفاً یک فایل PDF یا TXT آپلود کنید.')
        return
      }
    }

    setLoading(true)

    try {
      let res: Response

      if (mode === 'upload' && uploadedFile) {
        // ── Multipart upload ──────────────────────────────────────────────────
        const form = new FormData()
        form.append('file', uploadedFile)
        form.append('jobDescription', jd)
        if (jobTitle.trim()) form.append('jobTitle', jobTitle.trim())
        if (targetRole.trim()) form.append('targetRole', targetRole.trim())

        res = await fetch('/api/v1/career/job-match/upload', {
          method: 'POST',
          body: form,
        })
      } else {
        // ── JSON body (irno resume or pasted text) ────────────────────────────
        const body: Record<string, string | undefined> = {
          jobDescription: jd,
          jobTitle: jobTitle.trim() || undefined,
          targetRole: targetRole.trim() || undefined,
        }

        if (mode === 'irno' && selectedResumeId) {
          body['resumeDocumentId'] = selectedResumeId
          body['sourceType'] = 'IRNO_RESUME'
        } else if (mode === 'paste') {
          body['resumeText'] = pastedText.trim()
          body['sourceType'] = 'PASTED_TEXT'
        }

        res = await fetch('/api/v1/career/job-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const msg = errData?.message ?? errData?.error ?? `خطا (${res.status})`
        // Surface specific server-side errors clearly
        setError(Array.isArray(msg) ? msg.join(' — ') : String(msg))
        return
      }

      const data = await res.json()
      const report: JobMatchReportDto = data?.data ?? data
      setResult(report)
      setPastReports((prev) => [report, ...prev])
    } catch {
      setError('خطا در اتصال به سرور. اتصال اینترنت خود را بررسی کنید.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const jdLen = jobDescription.length

  return (
    <div className="space-y-6 max-w-2xl" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">تطابق شغلی</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          رزومه خود را با آگهی‌های استخدامی مقایسه کنید — کلیدواژه‌های جاافتاده، شکاف مهارتی و پیشنهادهای بهبود.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-1">
        {(
          [
            { id: 'irno', icon: '🗂', label: 'رزومه‌های من' },
            { id: 'upload', icon: '📄', label: 'آپلود رزومه' },
            { id: 'paste', icon: '📝', label: 'چسباندن متن' },
          ] as { id: SourceMode; icon: string; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setMode(tab.id); setError(null); setResult(null) }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              mode === tab.id
                ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 space-y-5">

        {/* Error banner */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {/* ── Mode-specific resume input ── */}

        {mode === 'irno' && (
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5">
              انتخاب رزومه (اختیاری)
            </label>
            {resumes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
                هنوز رزومه‌ای نساخته‌اید.{' '}
                <a href="/resumes/new" className="text-[var(--color-brand-600)] hover:underline">
                  ساخت رزومه
                </a>
              </div>
            ) : (
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
              >
                <option value="">— تحلیل بدون رزومه خاص —</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            )}
            <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
              اگر رزومه‌ای انتخاب نشود، فقط آگهی تحلیل می‌شود.
            </p>
          </div>
        )}

        {mode === 'upload' && (
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5">
              آپلود رزومه <span className="text-[var(--color-danger)]">*</span>
            </label>

            {!uploadedFile ? (
              <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-8 cursor-pointer hover:border-[var(--color-brand-600)] transition-colors">
                <span className="text-3xl">📄</span>
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                  کلیک کنید یا فایل را اینجا بکشید
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  PDF (متن قابل انتخاب) یا TXT — حداکثر ۵ مگابایت
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-3">
                <span className="text-2xl">📄</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {uploadedFile.name}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {(uploadedFile.size / 1024).toFixed(0)} KB
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearFile}
                  className="text-xs text-[var(--color-danger)] hover:underline shrink-0"
                >
                  حذف
                </button>
              </div>
            )}

            {fileError && (
              <p className="mt-1.5 text-xs text-[var(--color-danger)]">{fileError}</p>
            )}

            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              ⚠️ PDF اسکن‌شده (عکس) پشتیبانی نمی‌شود. اگر PDF شما متن قابل انتخاب ندارد از تب «چسباندن متن» استفاده کنید.
            </div>
          </div>
        )}

        {mode === 'paste' && (
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5">
              متن رزومه <span className="text-[var(--color-danger)]">*</span>
            </label>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={10}
              placeholder="متن کامل رزومه خود را اینجا بچسبانید..."
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)] resize-y font-mono"
            />
            <div className={`mt-1 text-[10px] flex justify-between ${pastedText.length < 30 && pastedText.length > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}`}>
              <span>
                {pastedText.length < 30 && pastedText.length > 0
                  ? `کوتاه است — حداقل ۳۰ کاراکتر نیاز است`
                  : 'متن رزومه را کپی–پیست کنید'}
              </span>
              <span>{pastedText.length} کاراکتر</span>
            </div>
          </div>
        )}

        {/* ── Common fields ── */}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
              عنوان شغل (اختیاری)
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="مثال: Senior Frontend Developer"
              maxLength={200}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
              موقعیت هدف (اختیاری)
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="مثال: React Developer"
              maxLength={200}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
            شرح موقعیت شغلی <span className="text-[var(--color-danger)]">*</span>
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={7}
            placeholder="متن آگهی استخدامی را اینجا بچسبانید..."
            maxLength={20000}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)] resize-none"
          />
          <div className={`mt-1 text-[10px] flex justify-between ${jdLen < 30 && jdLen > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}`}>
            <span>{jdLen < 30 && jdLen > 0 ? 'کوتاه است — حداقل ۳۰ کاراکتر' : 'متن آگهی شغلی را وارد کنید'}</span>
            <span>{jdLen.toLocaleString('fa-IR')} / ۲۰۰۰۰</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              در حال تحلیل...
            </>
          ) : (
            'تحلیل تطابق ←'
          )}
        </button>
      </form>

      {/* ── Result ── */}
      {result && <JobMatchResult report={result} />}

      {/* ── Past reports ── */}
      {pastReports.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 space-y-3">
          <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            گزارش‌های قبلی
          </h2>
          <div className="space-y-2">
            {pastReports.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-3 gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {r.jobTitle ?? 'بدون عنوان'}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      {sourceLabel(r.sourceType)}
                    </span>
                    {r.sourceFileName && (
                      <span className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[120px]">
                        · {r.sourceFileName}
                      </span>
                    )}
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      · {new Date(r.createdAt).toLocaleDateString('fa-IR')}
                    </span>
                  </div>
                </div>
                {r.overallScore !== null && (
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold"
                    style={{ borderColor: scoreColor(r.overallScore), color: scoreColor(r.overallScore) }}
                  >
                    {r.overallScore}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Result card component ──────────────────────────────────────────────────

function JobMatchResult({ report }: { report: JobMatchReportDto }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 space-y-5" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          نتیجه تطابق
        </h2>
        {report.sourceFileName && (
          <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] rounded px-2 py-0.5">
            📄 {report.sourceFileName}
          </span>
        )}
      </div>

      {/* Score circles */}
      <div className="flex gap-6 flex-wrap">
        {[
          { label: 'امتیاز کلی', value: report.overallScore },
          { label: 'تطابق کلیدواژه', value: report.keywordScore },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full border-4 text-xl font-bold"
              style={{ borderColor: scoreColor(s.value), color: scoreColor(s.value) }}
            >
              {s.value ?? '—'}
            </div>
            <div className="text-[10px] text-[var(--color-text-muted)] text-center">{s.label}</div>
            {s.value !== null && (
              <div className="text-[10px] font-medium" style={{ color: scoreColor(s.value) }}>
                {scoreLabel(s.value)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Matched keywords */}
      {report.matchedKeywords && report.matchedKeywords.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
            ✅ کلیدواژه‌های موجود در رزومه
          </div>
          <div className="flex flex-wrap gap-1.5">
            {report.matchedKeywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300"
              >
                ✓ {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing keywords */}
      {report.missingKeywords && report.missingKeywords.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
            ❌ کلیدواژه‌های جاافتاده از رزومه
          </div>
          <div className="flex flex-wrap gap-1.5">
            {report.missingKeywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
              >
                ✗ {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations && report.recommendations.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
            💡 پیشنهادها
          </div>
          <ul className="space-y-1.5">
            {report.recommendations.map((rec, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)] leading-relaxed"
              >
                <span className="text-[var(--color-brand-600)] shrink-0 mt-0.5">←</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
