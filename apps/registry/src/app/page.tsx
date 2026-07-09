import type { Metadata } from "next";
import { getModules } from "@/lib/registry";
import { SITE } from "@/lib/site";
import { webSiteJsonLd } from "@/lib/utils/jsonLd";
import { HomeTemplate } from "@/modules/marketing/templates/home";

export const metadata: Metadata = {
  alternates: { canonical: SITE.url },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD built from typed constants — no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd()) }}
      />
      <HomeTemplate modules={getModules()} />
    </>
  );
}
