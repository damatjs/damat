import { existsSync } from "node:fs";
import { join } from "node:path";
import { sections } from "./sections";

export function buildGuide(root: string) {
  let chapterNumber = 0;
  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    chapters: section.chapters.map((chapter) => {
      const inserted =
        chapter.file !== undefined && chapter.order !== undefined;
      if (!inserted) chapterNumber += 1;
      const order = inserted ? chapter.order! : chapterNumber;
      const file = inserted
        ? `guide/${chapter.file}`
        : `guide/${String(chapterNumber).padStart(2, "0")}-${chapter.id}.md`;
      if (!existsSync(join(root, "docs", file))) {
        throw new Error(`Missing chapter file: docs/${file}`);
      }
      return {
        id: chapter.id,
        order,
        title: chapter.title,
        slug: chapter.id,
        path: `docs/${file}`,
        summary: chapter.summary,
      };
    }),
  }));
}
