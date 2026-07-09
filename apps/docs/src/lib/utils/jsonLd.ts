import { SITE } from "@/lib/site";

/** JSON-LD helpers — typed objects rendered into `application/ld+json`. */

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

export function techArticleJsonLd({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description,
    url: `${SITE.url}${path}`,
    author: { "@type": "Organization", name: SITE.name, url: SITE.url },
  } as const;
}
