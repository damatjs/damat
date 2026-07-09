import fs from "node:fs";
import path from "node:path";
import { type RenderResult, renderMarkdown } from "./markdown";
import { DOCS_DIR, REPO_ROOT } from "./repo";
import type { NavSection, SearchDoc } from "./types";

export interface Chapter {
  id: string;
  order: number;
  title: string;
  slug: string;
  /** Repo-relative source path, e.g. `docs/guide/01-introduction.md`. */
  path: string;
  summary: string;
  section: string;
}

export interface Section {
  id: string;
  title: string;
  chapters: Chapter[];
}

interface GuideJson {
  guide: Array<{
    id: string;
    title: string;
    chapters: Array<{
      id: string;
      order: number;
      title: string;
      slug: string;
      path: string;
      summary: string;
    }>;
  }>;
}

function loadGuide(): GuideJson {
  const raw = fs.readFileSync(path.join(DOCS_DIR, "guide.json"), "utf8");
  return JSON.parse(raw) as GuideJson;
}

let cachedSections: Section[] | null = null;

export function getSections(): Section[] {
  if (cachedSections) return cachedSections;
  const guide = loadGuide();
  cachedSections = guide.guide.map((section) => ({
    id: section.id,
    title: section.title,
    chapters: section.chapters
      .map((c) => ({ ...c, section: section.title }))
      .sort((a, b) => a.order - b.order),
  }));
  return cachedSections;
}

/** Client-safe navigation tree (no source paths) for the sidebar/header. */
export function getNav(): NavSection[] {
  return getSections().map((section) => ({
    id: section.id,
    title: section.title,
    chapters: section.chapters.map((c) => ({
      slug: c.slug,
      title: c.title,
      summary: c.summary,
    })),
  }));
}

export function getChapters(): Chapter[] {
  return getSections()
    .flatMap((s) => s.chapters)
    .sort((a, b) => a.order - b.order);
}

export function getChapter(slug: string): Chapter | undefined {
  return getChapters().find((c) => c.slug === slug);
}

export function getAllSlugs(): string[] {
  return getChapters().map((c) => c.slug);
}

/** basename → in-site route, used to rewrite relative `.md` links. */
function buildSlugMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of getChapters()) {
    map[path.basename(c.path)] = `/docs/${c.slug}`;
  }
  return map;
}

/** Strip the markdown breadcrumb header and prev/next footer — we render our own. */
function cleanMarkdown(raw: string): string {
  let lines = raw.replace(/\r\n/g, "\n").split("\n");

  // Leading breadcrumb line (e.g. "[Damat Guide](../GUIDE.md) › Introduction").
  let i = 0;
  while ((lines[i] ?? "x").trim() === "") i++;
  const breadcrumb = lines[i];
  if (breadcrumb && /›/.test(breadcrumb) && /\]\(/.test(breadcrumb)) {
    lines = lines.slice(i + 1);
  }

  // Trailing nav line ("[Guide home] · Next: [...]") plus its `---` separator.
  while ((lines.at(-1) ?? "x").trim() === "") lines.pop();
  const last = lines.at(-1) ?? "";
  if (
    /\]\(/.test(last) &&
    /(Guide home|Guide index|Next:|Prev:|Package reference|←|→)/.test(last)
  ) {
    lines.pop();
    while ((lines.at(-1) ?? "x").trim() === "") lines.pop();
    if ((lines.at(-1) ?? "").trim() === "---") lines.pop();
  }

  return lines.join("\n").trim();
}

export interface Doc extends RenderResult {
  chapter: Chapter;
  prev?: Chapter;
  next?: Chapter;
}

export async function getDoc(slug: string): Promise<Doc | null> {
  const chapter = getChapter(slug);
  if (!chapter) return null;

  const raw = fs.readFileSync(path.join(REPO_ROOT, chapter.path), "utf8");
  const cleaned = cleanMarkdown(raw);
  const rendered = await renderMarkdown(cleaned, {
    sourcePath: chapter.path,
    slugMap: buildSlugMap(),
  });

  const chapters = getChapters();
  const idx = chapters.findIndex((c) => c.slug === slug);

  return {
    ...rendered,
    chapter,
    prev: idx > 0 ? chapters[idx - 1] : undefined,
    next: idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : undefined,
  };
}

export type { SearchDoc };

function toPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^[#>|]+/gm, " ")
    .replace(/[*_~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Compact, client-shippable search index built from the guide content. */
export function getSearchIndex(): SearchDoc[] {
  return getChapters().map((c) => {
    const raw = fs.readFileSync(path.join(REPO_ROOT, c.path), "utf8");
    const cleaned = cleanMarkdown(raw);
    const headings = Array.from(cleaned.matchAll(/^#{2,3}\s+(.+)$/gm)).map(
      (m) => (m[1] ?? "").replace(/[#`*_]/g, "").trim(),
    );
    return {
      slug: c.slug,
      title: c.title,
      section: c.section,
      summary: c.summary,
      headings,
      text: toPlainText(cleaned).slice(0, 1800),
    };
  });
}
