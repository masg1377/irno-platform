import { Injectable, Logger, OnModuleDestroy, ServiceUnavailableException, HttpException, HttpStatus } from '@nestjs/common'

// ── Custom error types ─────────────────────────────────────────────────────

/**
 * Thrown when the PDF queue is at capacity (PDF_EXPORT_QUEUE_MAX reached).
 * Caller should return HTTP 429 to the client.
 */
export class PdfQueueFullError extends Error {
  constructor() {
    super('PDF export queue is full')
    this.name = 'PdfQueueFullError'
  }
}

/**
 * Thrown when a PDF job exceeds PDF_EXPORT_TIMEOUT_MS.
 */
export class PdfTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`PDF generation timed out after ${timeoutMs}ms`)
    this.name = 'PdfTimeoutError'
  }
}

/**
 * Thrown when PDF_EXPORT_ENABLED=false.
 */
export class PdfDisabledError extends Error {
  constructor() {
    super('PDF export is disabled (PDF_EXPORT_ENABLED=false)')
    this.name = 'PdfDisabledError'
  }
}

// ── Simple in-process semaphore/queue ─────────────────────────────────────

/**
 * PdfSemaphore — limits concurrent PDF generation jobs.
 *
 * - `concurrency` slots can run at the same time.
 * - Additional jobs wait in a FIFO queue up to `queueMax`.
 * - When queueMax is exceeded, `acquire()` throws PdfQueueFullError immediately.
 * - Each `acquire()` must be paired with a `release()` in a finally block.
 */
class PdfSemaphore {
  private running = 0
  private readonly waiters: Array<() => void> = []

  constructor(
    private readonly concurrency: number,
    private readonly queueMax: number,
  ) {}

  /**
   * Acquires a slot. Resolves immediately if a slot is free.
   * Queues the caller if all slots are busy and queue has room.
   * Throws PdfQueueFullError immediately if queue is full.
   */
  async acquire(): Promise<void> {
    if (this.running < this.concurrency) {
      this.running++
      return
    }
    // All slots busy — check queue capacity
    if (this.waiters.length >= this.queueMax) {
      throw new PdfQueueFullError()
    }
    // Wait in queue
    return new Promise<void>((resolve) => {
      this.waiters.push(resolve)
    })
  }

  /**
   * Releases a slot. Wakes the next waiter if any, otherwise decrements running count.
   */
  release(): void {
    const next = this.waiters.shift()
    if (next) {
      // Pass the slot directly to the next waiter (running count stays the same)
      next()
    } else {
      this.running--
    }
  }

  get activeCount(): number { return this.running }
  get waitingCount(): number { return this.waiters.length }
}

// ── Service ────────────────────────────────────────────────────────────────

/**
 * CareerPdfService — server-side PDF generation using Playwright Chromium.
 *
 * Architecture:
 *  - Singleton browser instance is lazily launched on first PDF request and reused.
 *  - A new page is created per PDF job and closed immediately after.
 *  - Browser is closed on module destroy.
 *  - In-process semaphore limits concurrent jobs to PDF_EXPORT_CONCURRENCY (default 1).
 *  - Additional jobs wait up to PDF_EXPORT_QUEUE_MAX; beyond that, PdfQueueFullError.
 *  - Each job has a hard timeout of PDF_EXPORT_TIMEOUT_MS (default 30s).
 *
 * Runtime requirement (non-Docker):
 *  - Run `npx playwright install chromium` after `pnpm install` to install Chromium.
 *  - On Linux/Docker: see Dockerfile — system Chromium via Alpine packages.
 *
 * Docker/Alpine:
 *  - Install: chromium nss freetype harfbuzz ca-certificates ttf-freefont udev
 *  - Set env: PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
 *  - Set env: PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
 *
 * Env vars:
 *  - PDF_EXPORT_ENABLED=true         — feature flag; set 'false' to disable all PDF export
 *  - PDF_EXPORT_CONCURRENCY=1        — max simultaneous Chromium pages
 *  - PDF_EXPORT_QUEUE_MAX=5          — max jobs waiting; beyond → PdfQueueFullError
 *  - PDF_EXPORT_TIMEOUT_MS=30000     — per-job timeout in ms
 *
 * PDF output properties:
 *  - A4 format, print background (colours, watermark)
 *  - waitUntil: networkidle — ensures Google Fonts finish loading
 *  - Text is selectable in generated PDF
 */
@Injectable()
export class CareerPdfService implements OnModuleDestroy {
  private readonly logger = new Logger(CareerPdfService.name)
  private browser: any = null
  private semaphore: PdfSemaphore

  constructor() {
    const concurrency = this.getEnvInt('PDF_EXPORT_CONCURRENCY', 1, 1, 10)
    const queueMax    = this.getEnvInt('PDF_EXPORT_QUEUE_MAX',   5, 0, 50)
    this.semaphore = new PdfSemaphore(concurrency, queueMax)
    this.logger.log(
      `PDF export: enabled=${this.isEnabled()}, concurrency=${concurrency}, queueMax=${queueMax}, timeout=${this.getTimeoutMs()}ms`,
    )
  }

  // ── Config helpers ─────────────────────────────────────────────────────────

  isEnabled(): boolean {
    return process.env['PDF_EXPORT_ENABLED'] !== 'false'
  }

  private getTimeoutMs(): number {
    return this.getEnvInt('PDF_EXPORT_TIMEOUT_MS', 30_000, 5_000, 120_000)
  }

  private getEnvInt(key: string, defaultVal: number, min: number, max: number): number {
    const raw = process.env[key]
    if (!raw) return defaultVal
    const n = parseInt(raw, 10)
    if (isNaN(n)) return defaultVal
    return Math.max(min, Math.min(max, n))
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async onModuleDestroy() {
    if (this.browser) {
      try {
        await this.browser.close()
        this.logger.log('Playwright Chromium browser closed on module destroy')
      } catch {
        // Ignore errors during shutdown
      }
      this.browser = null
    }
  }

  // ── Browser management ─────────────────────────────────────────────────────

  /**
   * Returns the singleton browser, launching it lazily if needed.
   * Re-launches automatically if the browser has crashed.
   */
  private async getBrowser(): Promise<any> {
    if (this.browser) {
      try {
        if (this.browser.isConnected()) return this.browser
      } catch {
        this.browser = null
      }
    }

    try {
      // @ts-ignore — playwright must be installed: npx playwright install chromium
      const { chromium } = await import('playwright')

      // PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: set in Docker/Alpine to use system Chromium.
      // Omit (undefined) on dev/VPS where Playwright's own Chromium is installed.
      const executablePath = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'] || undefined

      this.browser = await chromium.launch({
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',                 // required inside Docker/VPS
          '--disable-setuid-sandbox',     // required inside Docker/VPS
          '--disable-dev-shm-usage',      // prevents /dev/shm exhaustion in containers
          '--disable-gpu',                // not needed for PDF generation
          '--font-render-hinting=none',   // better CJK/RTL font rendering
        ],
      })
      this.logger.log('Playwright Chromium browser started')
      return this.browser
    } catch (err: any) {
      this.logger.error('Failed to launch Playwright Chromium', err?.message)
      throw new Error(
        'PDF generation unavailable: Chromium is not installed. ' +
        'Run: npx playwright install chromium  (then restart the server). ' +
        'In Docker: ensure chromium Alpine packages are installed.',
      )
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Generates a PDF Buffer from a full HTML document string.
   *
   * Throws:
   *  - PdfDisabledError      if PDF_EXPORT_ENABLED=false
   *  - PdfQueueFullError     if the in-process queue is at capacity
   *  - PdfTimeoutError       if the job exceeds PDF_EXPORT_TIMEOUT_MS
   *  - Error                 if Chromium fails to launch or page.pdf() errors
   *
   * Always closes the Playwright page in a finally block.
   * Browser is reused across calls.
   *
   * @param html  Full HTML document (<!DOCTYPE html>...) — must include print CSS
   */
  async generatePdf(html: string): Promise<Buffer> {
    if (!this.isEnabled()) {
      throw new PdfDisabledError()
    }

    // Acquire semaphore slot (may queue or throw PdfQueueFullError)
    await this.semaphore.acquire()
    this.logger.debug(
      `PDF job started — active: ${this.semaphore.activeCount}, waiting: ${this.semaphore.waitingCount}`,
    )

    try {
      return await this.runWithTimeout(
        () => this.generatePdfInternal(html),
        this.getTimeoutMs(),
      )
    } finally {
      this.semaphore.release()
      this.logger.debug(
        `PDF job finished — active: ${this.semaphore.activeCount}, waiting: ${this.semaphore.waitingCount}`,
      )
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Core PDF generation — opens a Playwright page, renders HTML, exports PDF.
   * Page is always closed in a finally block.
   */
  private async generatePdfInternal(html: string): Promise<Buffer> {
    const browser = await this.getBrowser()
    const page = await browser.newPage()

    try {
      // waitUntil: 'networkidle' ensures Google Fonts finish loading.
      // The outer runWithTimeout wraps this entire call with a hard deadline.
      await page.setContent(html, { waitUntil: 'networkidle', timeout: this.getTimeoutMs() })

      const pdfUint8 = await page.pdf({
        format: 'A4',
        printBackground: true, // required for watermark and background colours
        // Margins handled by print CSS inside the HTML (@page, .page padding)
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      })

      return Buffer.from(pdfUint8)
    } finally {
      // Always release the page regardless of success or error
      await page.close().catch(() => {})
    }
  }

  /**
   * Wraps an async operation with a hard timeout.
   * Throws PdfTimeoutError if the deadline is exceeded.
   * The underlying operation is not cancelled (Playwright has no cancel API),
   * but the page is eventually closed by generatePdfInternal's finally block.
   */
  private runWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new PdfTimeoutError(timeoutMs))
      }, timeoutMs)

      fn()
        .then((result) => {
          clearTimeout(timer)
          resolve(result)
        })
        .catch((err) => {
          clearTimeout(timer)
          reject(err)
        })
    })
  }
}
