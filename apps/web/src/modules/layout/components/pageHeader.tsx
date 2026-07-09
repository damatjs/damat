import type { ReactNode } from "react";

/** Sub-page hero — eyebrow, H1, and a lede paragraph. */
export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="px-6 pb-14 pt-16 sm:pt-20 lg:px-10">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display mt-3 max-w-3xl text-4xl font-semibold leading-heading text-ink sm:text-5xl">
        {title}
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
        {children}
      </p>
    </section>
  );
}
