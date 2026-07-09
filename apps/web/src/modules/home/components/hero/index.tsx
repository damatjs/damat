import Link from "next/link";
import { ArrowRightIcon } from "@/assets/icons/arrowRight";
import { GitHubIcon } from "@/assets/icons/gitHub";
import { docsUrl, GITHUB_URL, REGISTRY_URL } from "@/lib/constants";
import { InstallCommand } from "@/modules/common/components/installCommand";

export function Hero() {
  return (
    <section className="hero-seq px-6 pb-16 pt-16 sm:pt-20 lg:px-10">
      <a
        href={REGISTRY_URL}
        target="_blank"
        rel="noreferrer noopener"
        className="land inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
      >
        <span
          className="h-1.5 w-1.5 rounded-full bg-brand"
          aria-hidden="true"
        />
        The module registry is live
        <ArrowRightIcon width={13} height={13} />
      </a>

      <h1 className="display land mt-6 max-w-4xl text-5xl font-medium leading-hero text-ink sm:text-6xl lg:text-7xl">
        The composable
        <br />
        backend framework
        <br />
        for TypeScript
      </h1>

      <p className="land mt-6 max-w-2xl text-lg leading-relaxed text-muted">
        Open source, built on Bun. Assemble models, services, routes, and
        workflows from plug-and-play modules — installed with one command, wired
        to your database and HTTP server at startup.
      </p>

      <div className="land mt-8 flex flex-wrap items-center gap-3">
        <Link
          href={docsUrl("getting-started")}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-canvas transition-opacity hover:opacity-85"
        >
          Start building
          <ArrowRightIcon width={15} height={15} />
        </Link>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-subtle"
        >
          <GitHubIcon width={15} height={15} />
          View on GitHub
        </a>
        <InstallCommand />
      </div>
    </section>
  );
}
