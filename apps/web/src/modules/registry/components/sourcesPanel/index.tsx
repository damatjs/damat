/** The three install sources `damat module add` accepts. */
const SOURCES = [
  {
    title: "Registry name",
    command: "damat module add damatjs/user@0.2.0",
    body: "Resolved through the registry index — entries carry an owner, a version list, and a verification status.",
  },
  {
    title: "Git URL",
    command:
      "damat module add https://github.com/acme/damat-modules.git#billing-v0.1.0",
    body: "Install straight from any git repository, pinned to a branch or tag. No registry entry required.",
  },
  {
    title: "Local path",
    command: "damat module add ../my-module",
    body: "Point at a module on disk while you develop it — the fastest authoring loop.",
  },
];

export function SourcesPanel() {
  return (
    <section className="border-t border-line px-6 py-16 lg:px-10">
      <h2 className="display text-2xl font-semibold text-ink sm:text-3xl">
        Three ways to install
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
        The registry is the shared catalog, but it is never a gatekeeper — a
        module is just a git repo or a folder that follows the module contract.
      </p>
      <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
        {SOURCES.map((source) => (
          <div key={source.title} className="bg-canvas p-5 sm:p-6">
            <h3 className="text-sm font-medium text-ink">{source.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {source.body}
            </p>
            <p className="mt-4 overflow-x-auto rounded-lg border border-line bg-subtle px-3 py-2 font-mono text-2xs text-ink">
              <span className="select-none text-brand">$ </span>
              {source.command}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
