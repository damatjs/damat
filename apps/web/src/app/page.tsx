import type { Metadata } from "next";
import { SITE } from "@/lib/constants";
import { getRegistryModules } from "@/lib/data/registry";
import { getReleaseTimeline } from "@/lib/data/releases";
import { getSiteStats } from "@/lib/data/stats";
import {
  faqPageJsonLd,
  organizationJsonLd,
  webSiteJsonLd,
} from "@/lib/utils/jsonLd";
import { FAQ_ITEMS } from "@/modules/home/components/faq/data";
import { HomeTemplate } from "@/modules/home/templates";

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
  description: SITE.description,
  alternates: { canonical: SITE.url },
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
};

export default function HomePage() {
  const jsonLd = [
    organizationJsonLd(),
    webSiteJsonLd(),
    faqPageJsonLd(FAQ_ITEMS),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD built from typed constants — no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeTemplate
        modules={getRegistryModules()}
        releaseGroups={getReleaseTimeline().lockstep.slice(0, 3)}
        stats={getSiteStats()}
      />
    </>
  );
}
