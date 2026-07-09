import { GITHUB_URL } from "@/lib/constants";
import type { ReleaseGroup } from "@/lib/data/releases";
import { PageHeader } from "@/modules/layout/components/pageHeader";
import { VersionGroup } from "@/modules/releases/components/versionGroup";

/** /releases — the change record: lockstep timeline + lines running ahead. */
export function ReleasesTemplate({
  lockstep,
  independent,
  currentVersion,
  codegenVersion,
}: {
  lockstep: ReleaseGroup[];
  independent: ReleaseGroup[];
  currentVersion: string;
  codegenVersion: string;
}) {
  return (
    <div className="mx-auto max-w-7xl border-line lg:border-x">
      <PageHeader eyebrow="Releases" title="Every change, in lockstep.">
        All published packages release together — one version moves the whole
        line, currently{" "}
        <span className="font-mono text-ink">v{currentVersion}</span>. A package
        appears under a version only when its own code changed; the full
        before/after notes and upgrade steps live{" "}
        <a
          href={`${GITHUB_URL}/tree/main/releases`}
          target="_blank"
          rel="noreferrer noopener"
          className="text-ink underline decoration-line underline-offset-4 hover:decoration-brand"
        >
          in the repo
        </a>
        .
      </PageHeader>

      <section
        aria-label="Version history"
        className="border-t border-line px-6 py-16 lg:px-10"
      >
        {lockstep.map((group) => (
          <VersionGroup key={group.version} group={group} />
        ))}
      </section>

      {independent.length > 0 && (
        <section
          aria-label="Independent version lines"
          className="border-t border-line px-6 py-16 lg:px-10"
        >
          <h2 className="display text-2xl font-semibold text-ink sm:text-3xl">
            The independent line
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
            <span className="font-mono text-ink">@damatjs/codegen</span> was
            published to npm at 1.0.0 before the shared line existed, so it runs
            ahead on its own version — currently{" "}
            <span className="font-mono text-ink">v{codegenVersion}</span> — and
            rejoins the lockstep once the shared line passes it.
          </p>
          <div className="mt-10">
            {independent.map((group) => (
              <VersionGroup key={group.version} group={group} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
