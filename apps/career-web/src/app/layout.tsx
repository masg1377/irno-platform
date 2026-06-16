import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'ایرنو CV — Career Studio',
    template: '%s | ایرنو CV',
  },
  description: 'ساخت رزومه حرفه‌ای، پروفایل عمومی، پورتفولیو و مسیر شغلی با ایرنو',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.fontcdn.ir" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://cdn.fontcdn.ir/Font/Persian/Yekan/Yekan.css" />
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
