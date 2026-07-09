/** The convictions the framework is built around. */
const PRINCIPLES = [
  {
    title: "Modules first",
    body: "A feature is a module: models, service, config, and migrations in one self-contained package you can author, build, and test in isolation — then install into any Damat app.",
  },
  {
    title: "Composed, not scaffolded",
    body: "Starters copy code into your repo and leave you to maintain it. Damat wires modules into your database and HTTP server at startup, so an upgrade is a version bump, not a merge.",
  },
  {
    title: "Typed end to end",
    body: "TypeScript strict mode everywhere — models to services to routes to workflows. If it compiles, the wiring is right.",
  },
  {
    title: "Boring where it counts",
    body: "PostgreSQL for data, Redis for speed, plain HTTP for transport. The novel part is the composition, not the storage engine.",
  },
];

export function Principles() {
  return (
    <section className="border-t border-line px-6 py-16 lg:px-10">
      <h2 className="display text-2xl font-semibold text-ink sm:text-3xl">
        What we optimize for
      </h2>
      <div className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
        {PRINCIPLES.map((principle) => (
          <div key={principle.title}>
            <h3 className="text-sm font-medium text-ink">{principle.title}</h3>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
              {principle.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
