import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllSlugs, getChapter, getDoc } from "@/lib/content";
import { ogImageUrl, SITE } from "@/lib/site";
import { breadcrumbJsonLd, techArticleJsonLd } from "@/lib/utils/jsonLd";
import { ChapterTemplate } from "@/modules/docs/templates/chapter";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const chapter = getChapter(slug);
  if (!chapter) return {};
  const url = `${SITE.url}/docs/${slug}`;
  const ogImage = ogImageUrl(chapter.title, chapter.section);
  return {
    title: chapter.title,
    description: chapter.summary,
    alternates: { canonical: url },
    openGraph: {
      title: chapter.title,
      description: chapter.summary,
      url,
      siteName: `${SITE.name} docs`,
      type: "article",
      images: [{ url: ogImage, width: 1200, height: 630, alt: chapter.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: chapter.title,
      description: chapter.summary,
      images: [ogImage],
    },
  };
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await getDoc(slug);
  if (!doc) notFound();

  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Docs", path: "/docs" },
      { name: doc.chapter.section },
      { name: doc.chapter.title, path: `/docs/${slug}` },
    ]),
    techArticleJsonLd({
      title: doc.chapter.title,
      description: doc.chapter.summary,
      path: `/docs/${slug}`,
    }),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD built from typed constants — no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ChapterTemplate doc={doc} />
    </>
  );
}
