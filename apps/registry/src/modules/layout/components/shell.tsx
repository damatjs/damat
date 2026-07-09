import type { ReactNode } from "react";

/** Page shell — content column flanked by the candy-stripe gutters. */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-shell px-4 sm:px-6 lg:px-8">
      <div
        className="stripes hidden w-4 shrink-0 border-x border-line lg:block"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 py-10 lg:px-8">{children}</div>
      <div
        className="stripes hidden w-4 shrink-0 border-x border-line lg:block"
        aria-hidden="true"
      />
    </div>
  );
}
