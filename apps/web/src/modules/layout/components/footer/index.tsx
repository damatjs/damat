import Link from "next/link";
import { GitHubIcon } from "@/assets/icons/gitHub";
import { GITHUB_URL } from "@/lib/constants";
import { LogoMark } from "@/modules/layout/components/logo";
import { FOOTER_COLUMNS } from "./links";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-7xl border-line px-4 py-16 sm:px-6 lg:border-x lg:px-10">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-7">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <LogoMark gradientId="damat-mark-footer" />
              <span className="text-base font-semibold tracking-tight text-ink">
                Damat
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              The composable backend framework for TypeScript — assemble exactly
              what your app needs from plug-and-play modules.
            </p>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:bg-subtle hover:text-ink"
            >
              <GitHubIcon width={16} height={16} />
              Star on GitHub
            </a>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-medium text-ink">{col.title}</p>
              <ul className="mt-3.5 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-sm text-muted transition-colors hover:text-ink"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-muted transition-colors hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col justify-between gap-3 border-t border-line pt-6 text-sm text-faint sm:flex-row sm:items-center">
          <p>Built with Bun, Hono, Effect-TS, &amp; PostgreSQL.</p>
          <p>MIT Licensed · © {new Date().getFullYear()} Damat</p>
        </div>
      </div>
    </footer>
  );
}
