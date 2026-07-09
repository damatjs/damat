import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { breadcrumbJsonLd } from "@/lib/utils/jsonLd";
import { PublishTemplate } from "@/modules/registry/templates/publish";

export const metadata: Metadata = {
  title: "Publish a module",
  description:
    "List your Damat module in the registry — validate, tag a release, and open a pull request. Or run your own registry from a single JSON file.",
  alternates: { canonical: `${SITE.url}/publish` },
  openGraph: {
    title: "Publish a module",
    description:
      "List your Damat module in the registry — validate, tag a release, and open a pull request.",
    url: `${SITE.url}/publish`,
    siteName: SITE.name,
    type: "website",
  },
};

export default function PublishPage() {
  const jsonLd = breadcrumbJsonLd([
    { name: "Registry", path: "/" },
    { name: "Publish", path: "/publish" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD built from typed constants — no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublishTemplate />
    </>
  );
}
