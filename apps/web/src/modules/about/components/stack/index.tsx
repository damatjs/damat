/** The pieces Damat stands on, and what each one is for. */
const STACK = [
  { name: "Bun", role: "Runtime, package manager, and test runner" },
  { name: "Hono", role: "HTTP routing and middleware" },
  { name: "Effect-TS", role: "Typed, composable business logic" },
  { name: "PostgreSQL", role: "The system of record" },
  { name: "Redis", role: "Caching and coordination" },
];

export function Stack() {
  return (
    <section className="border-t border-line px-6 py-16 lg:px-10">
      <h2 className="display text-2xl font-semibold text-ink sm:text-3xl">
        The stack underneath
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
        Damat does not hide its foundations — it arranges them. Every layer is a
        tool you may already know.
      </p>
      <dl className="mt-8 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
        {STACK.map((item) => (
          <div key={item.name} className="bg-canvas p-5">
            <dt className="font-mono text-sm font-medium text-ink">
              {item.name}
            </dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-muted">
              {item.role}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
