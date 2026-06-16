import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'ایرنو پلتفرم',
    template: '%s | ایرنو پلتفرم',
  },
  description: 'سیستم مدیریت مرکزی آکادمی ایرنو',
  robots: {
    index: false, // Internal tool — never index
    follow: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        {/* IranYekan — Persian UI font */}
        <link rel="preconnect" href="https://cdn.fontcdn.ir" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.fontcdn.ir/Font/Persian/Yekan/Yekan.css"
        />
        {/* Fallback: Vazirmatn if fontcdn is unavailable */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeScript />
        {children}
      </body>
    </html>
  )
}

/**
 * Inline script that sets the theme class before React hydration.
 * Prevents flash of wrong theme (FOWT) on page load.
 * Must be a blocking script in <head> or early in <body>.
 */
function ThemeScript() {
  const script = `
    (function() {
      try {
        var stored = localStorage.getItem('irno-theme');
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var theme = stored === 'dark' || stored === 'light' ? stored : (prefersDark ? 'dark' : 'light');
        document.documentElement.classList.toggle('dark', theme === 'dark');
      } catch(e) {}
    })();
  `
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
