import type { Metadata } from "next";
import { getModules } from "@/lib/registry";
import { SITE } from "@/lib/site";
import { webSiteJsonLd } from "@/lib/utils/jsonLd";
import { BrowseTemplate } from "@/modules/registry/templates/browse";

export const metadata: Metadata = {
  alternates: { canonical: SITE.url },
};

export default function BrowsePage() {
  const modules = getModules();

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD built from typed constants — no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd()) }}
      />
      <BrowseTemplate modules={modules} />
    </>
  );
}
