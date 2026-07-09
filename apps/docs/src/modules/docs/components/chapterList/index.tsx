import Link from "next/link";
import type { Section } from "@/lib/content";

/** Guide index — chapters grouped by section, numbered in reading order. */
export function ChapterList({ sections }: { sections: Section[] }) {
  let counter = 0;

  return (
    <div className="flex flex-col gap-12">
      {sections.map((section) => (
        <section key={section.id}>
          <h2 className="font-mono text-2xs font-medium uppercase tracking-widest text-faint">
            {section.title}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {section.chapters.map((chapter) => {
              counter += 1;
              return (
                <Link
                  key={chapter.slug}
                  href={`/docs/${chapter.slug}`}
                  className="group flex items-start gap-3 rounded-lg border border-line bg-surface p-4 transition-colors hover:bg-subtle"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-subtle font-mono text-xs text-faint transition-colors group-hover:border-brand/40 group-hover:text-brand">
                    {counter}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-medium text-ink">
                      {chapter.title}
                    </span>
                    <span className="mt-0.5 block text-sm leading-snug text-muted">
                      {chapter.summary}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
