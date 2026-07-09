import { ShieldCheckIcon } from "@/assets/icons/shieldCheck";
import type { Module } from "@/lib/registry";
import { SITE } from "@/lib/site";
import { CopyButton } from "@/modules/common/components/copyButton";
import { Shell } from "@/modules/layout/components/shell";
import { BrowseList } from "@/modules/registry/components/browseList";

const INDEX_URL = `${SITE.url}/index.json`;

/** The registry home: header, endpoint, stats, and the searchable list. */
export function BrowseTemplate({ modules }: { modules: Module[] }) {
  const verified = modules.filter((m) => m.verified).length;
  const versions = modules.reduce((sum, m) => sum + m.versions.length, 0);

  return (
    <Shell>
      <header className="max-w-3xl">
        <p className="eyebrow flex items-center gap-2">
          <ShieldCheckIcon width={13} height={13} />
          Owner &amp; verification on every module
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">
          The module registry for Damat
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Self-contained backend building blocks — auth, billing, teams,
          webhooks — each installable into any Damat app with one command.
        </p>

        <div className="mt-6 flex max-w-lg items-center justify-between gap-3 rounded-lg border border-line bg-subtle py-0.5 pl-4 pr-1 font-mono text-sm">
          <a href="/index.json" className="truncate text-muted hover:text-ink">
            {INDEX_URL}
          </a>
          <CopyButton text={INDEX_URL} />
        </div>

        <dl className="mt-4 flex items-center gap-5 text-sm text-faint">
          <div>
            <dt className="sr-only">Modules</dt>
            <dd>
              <strong className="text-ink">{modules.length}</strong> module
              {modules.length === 1 ? "" : "s"}
            </dd>
          </div>
          <span className="h-3 w-px bg-line-strong" aria-hidden="true" />
          <div>
            <dt className="sr-only">Verified</dt>
            <dd>
              <strong className="text-ink">{verified}</strong> verified
            </dd>
          </div>
          <span className="h-3 w-px bg-line-strong" aria-hidden="true" />
          <div>
            <dt className="sr-only">Published versions</dt>
            <dd>
              <strong className="text-ink">{versions}</strong> published version
              {versions === 1 ? "" : "s"}
            </dd>
          </div>
        </dl>
      </header>

      <div className="mt-10 border-t border-line pt-8">
        <BrowseList modules={modules} />
      </div>
    </Shell>
  );
}
