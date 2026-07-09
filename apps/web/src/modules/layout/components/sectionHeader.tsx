import type { ReactNode } from "react";

/** Section header — eyebrow + headline left, supporting text right. */
export function SectionHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-end lg:gap-16">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="display mt-3 text-3xl font-semibold leading-heading text-ink sm:text-4xl">
          {title}
        </h2>
      </div>
      <p className="text-base leading-relaxed text-muted lg:pb-1">{children}</p>
    </div>
  );
}
