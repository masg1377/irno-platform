import type { NextConfig } from 'next'

const isProd = process.env['NODE_ENV'] === 'production'

/**
 * Security headers applied to every hub-web response.
 *
 * CSP is now enforced (not report-only).
 *
 * 'unsafe-eval' is included only in development — required by Next.js/Turbopack HMR.
 * In production it is dropped.
 *
 * 'unsafe-inline' for scripts is required by the hardcoded theme bootstrap script
 * (dangerouslySetInnerHTML with a compile-time constant — not user data).
 * Future: replace with nonce-based CSP for full script-src hardening.
 */
function buildSecurityHeaders(): { key: string; value: string }[] {
  // Drop unsafe-eval in production — only dev HMR needs it.
  const scriptSrc = isProd
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"

  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')

  return [
    // Prevent MIME sniffing
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    // Deny framing from external origins (clickjacking)
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
    // No referrer on cross-origin navigation
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    // Restrict browser features
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    },
    // XSS protection for older browsers
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block',
    },
    // HSTS — only in production (Nginx also sets this; belt-and-braces)
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

  // Turbopack extension alias (Next.js 16)
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
        // Apply security headers to all routes
        source: '/(.*)',
        headers: buildSecurityHeaders(),
      },
    ]
  },

  async rewrites() {
    // Proxy /api/v1/* from hub-web to hub-api.
    // Enables same-origin cookie handling: irno_at / irno_rt set on :3000 not :4000.
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
