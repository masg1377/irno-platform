const isProd = process.env['NODE_ENV'] === 'production'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Disable type-checking and ESLint during production build.
  // Fix the underlying TS errors before removing these.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // Transpile the local shared package so its TypeScript is consumed directly.
  transpilePackages: ['@irno/meetino-shared'],

  // Output a self-contained build for the production Docker image.
  output: 'standalone',

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Allow SAMEORIGIN framing for in-page meeting embeds
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict APIs except camera/microphone (needed for video meetings)
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()',
          },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // HSTS in production
          ...(isProd
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
            : []),
          // CSP — enforced.
          // LiveKit requires connect-src wss:/ws: for WebRTC signaling.
          // media-src blob: required for local recording.
          // unsafe-eval dropped in production; unsafe-inline retained for theme script.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              isProd
                ? "script-src 'self' 'unsafe-inline'"
                : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: https: blob:",
              // LiveKit WebSocket signaling + hub-api calls
              "connect-src 'self' wss: ws: https:",
              // Local recording uses blob: URLs for media streams
              "media-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
