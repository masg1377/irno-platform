'use client'

import { useState } from 'react'

interface DownloadButtonProps {
  /** Profile slug — used to build the server-side PDF download URL */
  slug: string
  /** True when a real server-generated PDF exists for this profile */
  hasPdfExport: boolean
}

/**
 * DownloadButton — shown on public profile when allowPdfDownload=true.
 *
 * If hasPdfExport=true: renders a real anchor tag pointing to the
 * server-generated PDF at /api/v1/career/public/:slug/resume/download.
 *
 * If hasPdfExport=false: falls back to window.print() with a hint
 * to use "Save as PDF" in the browser print dialog.
 */
export function DownloadButton({ slug, hasPdfExport }: DownloadButtonProps) {
  const [showHint, setShowHint] = useState(false)

  const buttonClass =
    'inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-95 transition-all'

  const icon = (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )

  if (hasPdfExport) {
    return (
      <a
        href={`/api/v1/career/public/${slug}/resume/download`}
        download
        className={buttonClass}
      >
        {icon}
        دریافت PDF
      </a>
    )
  }

  // Fallback: browser print
  function handleClick() {
    setShowHint(true)
    setTimeout(() => window.print(), 100)
  }

  return (
    <>
      <button onClick={handleClick} className={buttonClass}>
        {icon}
        دریافت PDF
      </button>
      {showHint && (
        <p className="mt-2 text-xs text-white/60 text-center">
          در پنجره چاپ، «Save as PDF» را انتخاب کنید.
        </p>
      )}
    </>
  )
}
