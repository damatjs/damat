import Link from "next/link";
import { ArrowRightIcon } from "@/assets/icons/arrowRight";
import type { ReleaseGroup } from "@/lib/data/releases";
import { CodeText } from "@/modules/common/components/codeText";
import { SectionHeader } from "@/modules/layout/components/sectionHeader";

/** The newest release groups, condensed — the full record lives at /releases. */
export function ReleasesStrip({ groups }: { groups: ReleaseGroup[] }) {
  return (
    <section className="border-t border-line px-6 py-20 lg:px-10">
      <SectionHeader eyebrow="Changelog" title="Shipping in lockstep.">
        Every package releases together under one version, each with a
        before/after note and exact upgrade steps — no archaeology required.
      </SectionHeader>

      <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-3">
        {groups.map((group) => (
          <article
            key={group.version}
            className="flex flex-col bg-canvas p-5 sm:p-6"
          >
            <h3 className="font-mono text-md font-medium text-ink">
              <span className="text-faint">v</span>
              {group.version}
            </h3>
            <ul className="mt-3 flex flex-1 flex-col gap-3">
              {group.notes.slice(0, 2).map((note) => (
                <li
                  key={note.pkg}
                  className="text-sm leading-relaxed text-muted"
                >
                  <span className="font-mono text-xs text-ink">
                    {note.npmName}
                  </span>
                  <span className="mt-0.5 line-clamp-3 block">
                    <CodeText text={note.summary} />
                  </span>
                </li>
              ))}
            </ul>
            {group.notes.length > 2 && (
              <p className="mt-3 text-xs text-faint">
                +{group.notes.length - 2} more package
                {group.notes.length - 2 === 1 ? "" : "s"}
              </p>
            )}
          </article>
        ))}
      </div>

      <Link
        href="/releases"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-brand"
      >
        All releases
        <ArrowRightIcon width={13} height={13} />
      </Link>
    </section>
  );
}
