import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getModule, getModuleKeys } from "@/lib/registry";
import { SITE } from "@/lib/site";
import { breadcrumbJsonLd, moduleJsonLd } from "@/lib/utils/jsonLd";
import { ModuleTemplate } from "@/modules/registry/templates/module";

export function generateStaticParams() {
  return getModuleKeys().map((key) => ({ slug: key.split("/") }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const mod = getModule(slug.join("/"));
  if (!mod) return {};
  const url = `${SITE.url}/modules/${mod.key}`;
  const description = mod.description ?? `The ${mod.key} module for Damat.`;
  const ogImage = `${SITE.url}/og?title=${encodeURIComponent(mod.key)}&eyebrow=${encodeURIComponent("damat module")}`;
  return {
    title: mod.key,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: mod.key,
      description,
      url,
      siteName: SITE.name,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: mod.key }],
    },
    twitter: {
      card: "summary_large_image",
      title: mod.key,
      description,
      images: [ogImage],
    },
  };
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const mod = getModule(slug.join("/"));
  if (!mod) notFound();

  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Registry", path: "/" },
      { name: mod.key, path: `/modules/${mod.key}` },
    ]),
    moduleJsonLd(mod),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD built from typed constants — no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ModuleTemplate module={mod} />
    </>
  );
}
