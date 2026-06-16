import { Injectable } from '@nestjs/common'

@Injectable()
export class CertificateRenderService {
  /**
   * Generates an HTML certificate that can be printed/saved as PDF by the browser.
   * Server-side PDF (via puppeteer/playwright) can be added later.
   */
  renderHtml(cert: {
    title: string
    certificateNumber: string
    studentDisplayName: string
    issuedAt: Date | string
    expiresAt?: Date | string | null
    verificationCode: string
    type: string
    status: string
  }): string {
    const issuedDate = new Date(cert.issuedAt).toLocaleDateString('fa-IR')
    const expiresDate = cert.expiresAt
      ? new Date(cert.expiresAt).toLocaleDateString('fa-IR')
      : null
    const verifyUrl = `${process.env['NEXT_PUBLIC_HUB_URL'] ?? 'https://hub.irno.ir'}/verify/certificate/${cert.verificationCode}`

    const statusLabel =
      cert.status === 'REVOKED'
        ? 'لغوشده'
        : cert.status === 'EXPIRED'
          ? 'منقضی‌شده'
          : 'معتبر'

    return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>${cert.title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Vazirmatn', Tahoma, Arial, sans-serif; background: #f8f7f4; direction: rtl; }
  .cert { max-width: 794px; margin: 40px auto; background: #fff; border: 3px solid #1a3d5c; border-radius: 12px; padding: 60px 80px; position: relative; }
  .cert::before { content: ''; position: absolute; inset: 12px; border: 1px solid #c9a84c; border-radius: 6px; pointer-events: none; }
  .logo-area { text-align: center; margin-bottom: 32px; }
  .logo-text { font-size: 28px; font-weight: 700; color: #1a3d5c; letter-spacing: -0.5px; }
  .logo-sub { font-size: 13px; color: #888; margin-top: 4px; }
  .cert-title { text-align: center; font-size: 22px; font-weight: 700; color: #1a3d5c; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 2px solid #e8e4db; }
  .body-text { text-align: center; font-size: 15px; line-height: 2; color: #333; margin-bottom: 28px; }
  .student-name { font-size: 26px; font-weight: 700; color: #1a3d5c; display: inline-block; border-bottom: 2px solid #c9a84c; padding-bottom: 4px; margin: 8px 0; }
  .meta-row { display: flex; gap: 32px; justify-content: center; margin-top: 32px; margin-bottom: 32px; }
  .meta-item { text-align: center; }
  .meta-label { font-size: 11px; color: #888; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .meta-value { font-size: 14px; font-weight: 600; color: #1a3d5c; }
  .verify-section { text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e8e4db; }
  .verify-label { font-size: 11px; color: #888; margin-bottom: 6px; }
  .verify-code { font-size: 13px; font-weight: 600; color: #1a3d5c; font-family: monospace; background: #f0f4f8; padding: 6px 16px; border-radius: 4px; display: inline-block; letter-spacing: 2px; }
  .verify-url { font-size: 11px; color: #888; margin-top: 8px; word-break: break-all; }
  .stamp { position: absolute; bottom: 60px; left: 80px; width: 80px; height: 80px; border: 3px solid #1a3d5c; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-direction: column; }
  .stamp-text { font-size: 8px; color: #1a3d5c; font-weight: 700; text-align: center; }
  @media print { body { background: white; } .cert { border: 3px solid #1a3d5c; margin: 0; } }
</style>
</head>
<body>
<div class="cert">
  <div class="logo-area">
    <div class="logo-text">ایرنو</div>
    <div class="logo-sub">آموزشگاه ایرنو — Irno Academy</div>
  </div>
  <div class="cert-title">${cert.title}</div>
  <div class="body-text">
    این گواهی‌نامه به<br/>
    <span class="student-name">${cert.studentDisplayName}</span><br/>
    اعطا می‌گردد.
  </div>
  <div class="meta-row">
    <div class="meta-item">
      <div class="meta-label">شماره مدرک</div>
      <div class="meta-value">${cert.certificateNumber}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">تاریخ صدور</div>
      <div class="meta-value">${issuedDate}</div>
    </div>
    ${expiresDate ? `<div class="meta-item"><div class="meta-label">تاریخ انقضا</div><div class="meta-value">${expiresDate}</div></div>` : ''}
    <div class="meta-item">
      <div class="meta-label">وضعیت</div>
      <div class="meta-value">${statusLabel}</div>
    </div>
  </div>
  <div class="verify-section">
    <div class="verify-label">کد اعتبارسنجی</div>
    <div class="verify-code">${cert.verificationCode}</div>
    <div class="verify-url">برای تأیید اعتبار: ${verifyUrl}</div>
  </div>
  <div class="stamp"><div class="stamp-text">ایرنو<br/>تأیید شده</div></div>
</div>
</body>
</html>`
  }
}
