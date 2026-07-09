import type { Metadata } from 'next'
import './globals.css'
import { inter, jetbrainsMono } from '@/assets/fonts'
import { getNav, getSearchIndex } from '@/lib/content'
import { SITE } from '@/lib/site'
import { Footer } from '@/modules/layout/components/footer'
import { Header } from '@/modules/layout/components/header'

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} docs — ${SITE.tagline}`,
    template: `%s · ${SITE.name} docs`,
  },
  description: SITE.description,
  openGraph: {
    title: `${SITE.name} docs — ${SITE.tagline}`,
    description: SITE.description,
    type: 'website',
    siteName: `${SITE.name} docs`,
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
}

// Runs before paint to set the theme class and avoid a flash of the wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&m)){document.documentElement.classList.add('dark')}}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const sections = getNav()
  const searchIndex = getSearchIndex()

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        <Header sections={sections} searchIndex={searchIndex} />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
