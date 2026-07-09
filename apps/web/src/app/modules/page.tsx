import type { Metadata } from "next";
import { SITE } from "@/lib/constants";
import { getRegistryModules } from "@/lib/data/registry";
import { breadcrumbJsonLd } from "@/lib/utils/jsonLd";
import { RegistryTemplate } from "@/modules/registry/templates";

const TITLE = "Modules";
const DESCRIPTION =
  "Browse the Damat module registry — plug-and-play backend features like auth and billing, installed with one command from the registry, a git URL, or a local path.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE.url}/modules` },
  openGraph: {
    title: `${TITLE} · ${SITE.name}`,
    description: DESCRIPTION,
    url: `${SITE.url}/modules`,
    siteName: SITE.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} · ${SITE.name}`,
    description: DESCRIPTION,
  },
};

export default function ModulesPage() {
  const modules = getRegistryModules();
  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Modules", path: "/modules" },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Damat module registry",
      itemListElement: modules.map((module, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: module.id,
        description: module.description,
      })),
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD built from typed repo data — no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RegistryTemplate modules={modules} />
    </>
  );
}
