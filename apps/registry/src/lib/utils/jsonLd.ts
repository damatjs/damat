import type { Module } from "@/lib/registry";
import { SITE } from "@/lib/site";

/** JSON-LD helpers — typed objects rendered into `application/ld+json`. */

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
  } as const;
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path?: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.path ? { item: `${SITE.url}${item.path}` } : {}),
    })),
  } as const;
}

export function moduleJsonLd(mod: Module) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: mod.key,
    description: mod.description,
    url: `${SITE.url}/modules/${mod.key}`,
    ...(mod.repository ? { codeRepository: mod.repository } : {}),
    ...(mod.license ? { license: mod.license } : {}),
    ...(mod.latest ? { version: mod.latest } : {}),
    programmingLanguage: "TypeScript",
    keywords: mod.keywords.join(", "),
  } as const;
}
