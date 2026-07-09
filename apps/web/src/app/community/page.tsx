import type { Metadata } from "next";
import { SITE } from "@/lib/constants";
import { breadcrumbJsonLd } from "@/lib/utils/jsonLd";
import { CommunityTemplate } from "@/modules/community/templates";

const TITLE = "Community";
const DESCRIPTION =
  "Damat is built in the open on GitHub. Join the discussions, report issues, contribute code or docs, and publish your own modules to the registry.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE.url}/community` },
  openGraph: {
    title: `${TITLE} · ${SITE.name}`,
    description: DESCRIPTION,
    url: `${SITE.url}/community`,
    siteName: SITE.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} · ${SITE.name}`,
    description: DESCRIPTION,
  },
};

export default function CommunityPage() {
  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Community", path: "/community" },
    ]),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD built from typed constants — no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CommunityTemplate />
    </>
  );
}
