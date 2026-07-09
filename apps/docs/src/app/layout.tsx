import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { inter, jetbrainsMono } from "@/assets/fonts";
import { getNav, getSearchIndex } from "@/lib/content";
import { SITE } from "@/lib/site";
import { Footer } from "@/modules/layout/components/footer";
import { Header } from "@/modules/layout/components/header";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} docs — ${SITE.tagline}`,
    template: `%s · ${SITE.name} docs`,
  },
  description: SITE.description,
  applicationName: `${SITE.name} docs`,
  keywords: [...SITE.keywords],
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  publisher: SITE.name,
  openGraph: {
    type: "website",
    siteName: `${SITE.name} docs`,
    title: `${SITE.name} docs — ${SITE.tagline}`,
    description: SITE.description,
    url: `${SITE.url}/docs`,
    locale: SITE.locale,
    images: [
      {
        url: SITE.ogImage,
        width: 1200,
        height: 630,
        alt: `${SITE.name} docs — ${SITE.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} docs — ${SITE.tagline}`,
    description: SITE.description,
    images: [SITE.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

// Runs before paint to set the theme class and avoid a flash of the wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&m)){document.documentElement.classList.add('dark')}}catch(e){}})();`;

const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS;
const analyticsEnabled = process.env.NODE_ENV === "production" && !!gaId;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sections = getNav();
  const searchIndex = getSearchIndex();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static first-paint theme script — no user input
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        {analyticsEnabled && (
          <>
            <Script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            />
            <Script
              id="ga-init"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: Google Analytics gtag inline script
              dangerouslySetInnerHTML={{
                __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}');
           `,
              }}
            />
          </>
        )}
      </head>
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        <Header sections={sections} searchIndex={searchIndex} />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
