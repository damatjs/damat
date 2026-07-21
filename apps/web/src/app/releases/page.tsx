import type { Metadata } from "next";
import { SITE } from "@/lib/constants";
import {
  getArchivedCodegenVersion,
  getReleaseTimeline,
} from "@/lib/data/releases";
import { breadcrumbJsonLd } from "@/lib/utils/jsonLd";
import { ReleasesTemplate } from "@/modules/releases/templates";

const TITLE = "Releases";
const DESCRIPTION =
  "The Damat changelog — what changed in every version of every package, with upgrade notes. All packages release in lockstep.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE.url}/releases` },
  openGraph: {
    title: `${TITLE} · ${SITE.name}`,
    description: DESCRIPTION,
    url: `${SITE.url}/releases`,
    siteName: SITE.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} · ${SITE.name}`,
    description: DESCRIPTION,
  },
};

export default function ReleasesPage() {
  const { current, lockstep, independent } = getReleaseTimeline();
  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Releases", path: "/releases" },
    ]),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD built from typed repo data — no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReleasesTemplate
        lockstep={lockstep}
        independent={independent}
        currentVersion={current}
        archivedCodegenVersion={getArchivedCodegenVersion()}
      />
    </>
  );
}
