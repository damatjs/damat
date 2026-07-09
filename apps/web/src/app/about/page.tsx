import type { Metadata } from "next";
import { SITE } from "@/lib/constants";
import { breadcrumbJsonLd, organizationJsonLd } from "@/lib/utils/jsonLd";
import { AboutTemplate } from "@/modules/about/templates";

const TITLE = "About";
const DESCRIPTION =
  "Why Damat exists: a composable, MIT-licensed backend framework for TypeScript on Bun, built around self-contained modules instead of monolithic opinions or copied boilerplate.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE.url}/about` },
  openGraph: {
    title: `${TITLE} · ${SITE.name}`,
    description: DESCRIPTION,
    url: `${SITE.url}/about`,
    siteName: SITE.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} · ${SITE.name}`,
    description: DESCRIPTION,
  },
};

export default function AboutPage() {
  const jsonLd = [
    organizationJsonLd(),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "About", path: "/about" },
    ]),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD built from typed constants — no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AboutTemplate />
    </>
  );
}
