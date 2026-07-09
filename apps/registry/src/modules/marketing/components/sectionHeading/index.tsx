/** Eyebrow + display title + optional lead — the heading of every marketing section. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="relative max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="display mt-3 text-3xl text-ink sm:text-4xl">{title}</h2>
      {lead ? (
        <p className="mt-4 text-md leading-relaxed text-muted">{lead}</p>
      ) : null}
    </div>
  );
}
