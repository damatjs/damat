import Link from "next/link";
import { ArrowRightIcon } from "@/assets/icons/arrowRight";
import { docsUrl, GITHUB_URL, REGISTRY_URL } from "@/lib/constants";

const STEPS = [
  {
    title: "Scaffold",
    body: "damat module init creates a standalone module package — models, service, config, migrations — that builds and tests on its own.",
  },
  {
    title: "Publish",
    body: "Push it to any git repository and tag a version. That repo is the distribution — there is nothing else to upload.",
  },
  {
    title: "List it",
    body: "Open a pull request adding your entry to the registry index so anyone can install it by name.",
  },
];

/** How to get a module of your own into the registry. */
export function PublishPanel() {
  return (
    <section className="border-t border-line px-6 py-16 lg:px-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-start">
        <div>
          <h2 className="display text-2xl font-semibold text-ink sm:text-3xl">
            Publish your own
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
            A module is a single self-contained feature you can build and test
            in isolation, then share from any git repo.
          </p>
          <ol className="mt-8 flex flex-col gap-6">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line font-mono text-xs text-muted">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-sm font-medium text-ink">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-line bg-subtle p-6">
          <p className="text-sm leading-relaxed text-muted">
            The authoring guide walks through the module contract end to end —
            naming, models, migrations, workflows, and validation.
          </p>
          <Link
            href={docsUrl("authoring-modules")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-brand"
          >
            Read the authoring guide
            <ArrowRightIcon width={13} height={13} />
          </Link>
          <a
            href={REGISTRY_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-brand"
          >
            Browse the registry
            <ArrowRightIcon width={13} height={13} />
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-brand"
          >
            Open a registry PR
            <ArrowRightIcon width={13} height={13} />
          </a>
        </div>
      </div>
    </section>
  );
}
