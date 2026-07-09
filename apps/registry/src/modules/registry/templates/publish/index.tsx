import { DOCS_URL, GITHUB_URL, SITE } from "@/lib/site";
import { CopyButton } from "@/modules/common/components/copyButton";
import { Shell } from "@/modules/layout/components/shell";
import { InstallSnippet } from "@/modules/registry/components/installSnippet";

const ENTRY_SAMPLE = `"your-org/your-module": {
  "source": "https://github.com/your-org/damat-modules.git#main",
  "description": "One line on what the module does.",
  "latest": "0.1.0",
  "versions": {
    "0.1.0": "https://github.com/your-org/damat-modules.git#your-module-v0.1.0"
  },
  "owner": { "namespace": "your-org", "verified": false },
  "verification": { "status": "unverified" },
  "keywords": ["billing", "stripe"],
  "license": "MIT",
  "repository": "https://github.com/your-org/damat-modules"
}`;

const STATUSES: Array<[string, string, string]> = [
  ["verified", "Reviewed; source pinned by the registry", "installs cleanly"],
  ["unverified", "Listed, not reviewed", "subject to the consumer policy"],
  ["pending", "Review in progress", "subject to the consumer policy"],
  ["rejected / revoked", "Blocked by the registry", "always refused"],
];

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-subtle font-mono text-xs text-faint">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{title}</p>
        <div className="mt-1.5 text-sm leading-relaxed text-muted">
          {children}
        </div>
      </div>
    </li>
  );
}

/** How to get a module listed here — and how to run your own registry. */
export function PublishTemplate() {
  return (
    <Shell>
      <header className="max-w-3xl">
        <p className="eyebrow">Publish</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">
          Publish a module to the registry
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Anyone can install your module straight from git — listing it here
          adds a name people can install by, an owner, and a verification
          status. The registry is one JSON index; publishing is a pull request.
        </p>
      </header>

      <ol className="mt-10 max-w-3xl space-y-8 border-t border-line pt-8">
        <Step n={1} title="Validate and build your module">
          <p>
            A clean validate run means the module meets the contract and is
            registry-ready. See the{" "}
            <a
              href={`${DOCS_URL}/docs/authoring-modules`}
              className="font-medium text-brand hover:underline"
            >
              authoring guide
            </a>
            .
          </p>
          <InstallSnippet
            command="damat module validate && damat module build"
            className="mt-3"
          />
        </Step>

        <Step n={2} title="Tag the release in your module's repo">
          <p>
            Each published version maps to an immutable git tag (e.g.{" "}
            <code className="font-mono text-code">your-module-v0.1.0</code>) so
            releases can't change under consumers while{" "}
            <code className="font-mono text-code">latest</code> advances.
          </p>
        </Step>

        <Step n={3} title="Open a pull request adding your entry">
          <p>
            The index for this registry lives in the{" "}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-brand hover:underline"
            >
              damatjs/damat
            </a>{" "}
            monorepo at{" "}
            <code className="font-mono text-code">
              apps/registry/data/registry.json
            </code>
            . Add an entry keyed by{" "}
            <code className="font-mono text-code">namespace/name</code>:
          </p>
          <div className="mt-3 overflow-hidden rounded-lg border border-line bg-subtle">
            <div className="flex items-center justify-between border-b border-line py-0.5 pl-3 pr-1">
              <span className="font-mono text-2xs uppercase tracking-widest text-faint">
                registry.json
              </span>
              <CopyButton text={ENTRY_SAMPLE} />
            </div>
            <pre className="overflow-x-auto px-3 py-2.5 font-mono text-code leading-relaxed text-muted">
              {ENTRY_SAMPLE}
            </pre>
          </div>
          <p className="mt-3">
            New entries start{" "}
            <code className="font-mono text-code">unverified</code>; the
            registry operators review and stamp them — an author can never
            self-verify.
          </p>
        </Step>
      </ol>

      <section className="mt-12 max-w-3xl border-t border-line pt-8">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Verification statuses
        </h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-subtle/60 text-left font-mono text-2xs uppercase tracking-widest text-faint">
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Meaning</th>
                <th className="px-4 py-2.5 font-medium">Install behavior</th>
              </tr>
            </thead>
            <tbody>
              {STATUSES.map(([status, meaning, behavior]) => (
                <tr key={status} className="border-b border-line last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-ink">
                    {status}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{meaning}</td>
                  <td className="px-4 py-2.5 text-muted">{behavior}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Consumers gate installs with{" "}
          <code className="font-mono text-code">DAMAT_MODULE_VERIFY</code> (
          <code className="font-mono text-code">off</code> /{" "}
          <code className="font-mono text-code">warn</code> /{" "}
          <code className="font-mono text-code">require</code>). Path and git
          sources bypass the registry and need an explicit{" "}
          <code className="font-mono text-code">--allow-unverified</code>.
        </p>
      </section>

      <section className="mt-12 max-w-3xl border-t border-line pt-8">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Run your own registry
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Nothing about the index is special to {SITE.name} — host the JSON
          anywhere and point{" "}
          <code className="font-mono text-code">DAMAT_MODULE_REGISTRY</code> at
          it. A private registry for your organization is a single static file:
        </p>
        <InstallSnippet
          command="export DAMAT_MODULE_REGISTRY=https://modules.internal.acme.dev/index.json"
          className="mt-3"
        />
        <p className="mt-3 text-sm text-muted">
          Full write-up:{" "}
          <a
            href={`${DOCS_URL}/docs/publishing-modules`}
            className="font-medium text-brand hover:underline"
          >
            Publishing modules &amp; running a registry
          </a>{" "}
          in the docs.
        </p>
      </section>
    </Shell>
  );
}
