import type { NextConfig } from 'next'

const isProd = process.env['NODE_ENV'] === 'production'

/**
 * Security headers for career-web.
 *
 * Career Studio serves public resume pages and an authenticated studio.
 * The public pages are indexed by search engines — so we allow framing
 * only via SAMEORIGIN (not DENY) to allow future embedded portfolio widgets.
 *
 * CSP is now enforced (not report-only).
 * 'unsafe-eval' dropped in production — only dev HMR requires it.
 * 'unsafe-inline' retained for the theme bootstrap script (compile-time constant).
 * Future: replace with nonce-based CSP.
 */
function buildSecurityHeaders(): { key: string; value: string }[] {
  const scriptSrc = isProd
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"

  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    // img-src: allow https: for user-provided cover image URLs
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // frame-src: srcdoc iframe for resume preview panel (same origin + blob: for PDF)
    "frame-src 'self' blob:",
    "frame-ancestors 'self'",
  ].join('; ')

  return [
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    // SAMEORIGIN instead of DENY — public profile may be embedded by Irno pages
    {
      key: 'X-Frame-Options',
      value: 'SAMEORIGIN',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    },
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block',
    },
    ...(isProd
      ? [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ]
      : []),
    // CSP — enforced. Phase 10: upgrade script-src to nonce-based.
    {
      key: 'Content-Security-Policy',
      value: csp,
    },
  ]
}

const nextConfig: NextConfig = {
  transpilePackages: ['@irno/theme'],
  output: 'standalone',

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  turbopack: {
    resolveExtensionAlias: {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    },
  } as unknown as import('next').NextConfig['turbopack'],

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: buildSecurityHeaders(),
      },
    ]
  },

  async rewrites() {
    // Proxy /api/v1/* → hub-api (career endpoints live in hub-api)
    const apiUrl = process.env['HUB_API_URL'] ?? 'http://localhost:4000'
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
