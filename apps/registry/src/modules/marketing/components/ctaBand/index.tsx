import Link from "next/link";
import { CopyButton } from "@/modules/common/components/copyButton";
import { NPMRC_SNIPPET } from "@/modules/marketing/data/shared";

/** Closing call-to-action band shared by marketing pages. */
export function CtaBand() {
  return (
    <section className="relative overflow-hidden rounded-xl border border-line bg-subtle p-8 sm:p-12">
      <p className="eyebrow">Get started</p>
      <h2 className="display mt-3 max-w-xl text-3xl text-ink sm:text-4xl">
        Put a gate in front of your installs.
      </h2>
      <div className="cmd mt-6 max-w-lg justify-between">
        <span className="truncate text-muted">{NPMRC_SNIPPET}</span>
        <CopyButton text={NPMRC_SNIPPET} />
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/modules" className="btn-primary">
          Browse the registry
        </Link>
        <Link
          href="/publish"
          className="inline-flex h-10 items-center rounded-lg border border-line-strong px-4 text-sm text-muted transition-colors hover:text-ink"
        >
          Publish a package
        </Link>
      </div>
    </section>
  );
}
