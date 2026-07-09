import type { ReleaseGroup } from "@/lib/data/releases";
import { CodeText } from "@/modules/common/components/codeText";

/** One version on the timeline — the packages whose own code changed in it. */
export function VersionGroup({ group }: { group: ReleaseGroup }) {
  return (
    <article className="grid gap-4 border-t border-line py-10 first:border-t-0 first:pt-0 md:grid-cols-[10rem_1fr] md:gap-8">
      <h2 className="font-mono text-lg font-medium text-ink">
        <span className="text-faint">v</span>
        {group.version}
      </h2>

      <ul className="flex flex-col gap-6">
        {group.notes.map((note) => (
          <li key={note.pkg}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="font-mono text-sm font-medium text-ink">
                {note.npmName}
              </h3>
              <a
                href={note.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs text-faint transition-colors hover:text-ink"
              >
                Full note ↗
              </a>
            </div>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted">
              <CodeText text={note.summary} />
            </p>
          </li>
        ))}
      </ul>
    </article>
  );
}
