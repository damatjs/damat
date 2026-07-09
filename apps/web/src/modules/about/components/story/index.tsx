/** Why the project exists — answer-first, quotable prose. */
export function Story() {
  return (
    <section className="border-t border-line px-6 py-16 lg:px-10">
      <div className="grid gap-10 lg:grid-cols-[10rem_1fr]">
        <h2 className="text-sm font-medium text-ink">Why Damat</h2>
        <div className="flex max-w-3xl flex-col gap-5 text-base leading-relaxed text-muted">
          <p>
            Damat exists because backend teams keep rebuilding the same features
            — users, billing, queues, audit logs — inside frameworks that make
            those features hard to share. A monolithic framework hands you its
            opinions; a starter template hands you code you now own forever.
            Neither gives you a unit of reuse.
          </p>
          <p>
            Damat&apos;s answer is the module: a self-contained package with its
            own models, service, config, and migrations, developed and tested on
            its own, then installed into an app with one command. The
            framework&apos;s job is composition — at startup it wires every
            installed module to your PostgreSQL database and your HTTP server
            and hands you one typed backend.
          </p>
          <p>
            The whole project is developed in the open: one monorepo holding
            every package, its docs, and the registry index, released in
            lockstep so there is a single version to reason about.
          </p>
        </div>
      </div>
    </section>
  );
}
