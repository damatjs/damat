import Link from 'next/link'
import { highlightCode } from '@/lib/markdown'
import { GITHUB_URL } from '@/lib/site'
import { CopyButton } from '@/components/CopyButton'
import { CodeCard } from '@/components/CodeCard'
import {
  ArrowRightIcon,
  DatabaseIcon,
  GitHubIcon,
  LayersIcon,
  PuzzleIcon,
  RouteIcon,
  SparklesIcon,
  TerminalIcon,
  WorkflowIcon,
  ZapIcon,
} from '@/components/icons'

const INSTALL = 'bunx create-damat-app@latest my-app'

const CONFIG_SAMPLE = `import { defineConfig } from "@damatjs/framework";

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL ?? "",
    redisUrl: process.env.REDIS_URL,
    http: { port: 6543 },
  },
  // Register each module by id — Damat wires
  // it to the DB and HTTP server at startup.
  modules: {
    user:    { resolve: "./src/modules/user", id: "user" },
    billing: { resolve: "@acme/billing",      id: "billing" },
  },
});`

const features = [
  {
    icon: PuzzleIcon,
    title: 'Composable modules',
    body: 'Every concern — users, billing, teams — is a self-contained module with its own models, migrations, service, config, and workflows. Author in isolation, install anywhere.',
    href: '/docs/concepts',
  },
  {
    icon: DatabaseIcon,
    title: 'Fluent ORM',
    body: 'A type-safe model DSL over PostgreSQL with a real migration system, service base classes, auto-generated CRUD, transactions, and connection pooling.',
    href: '/docs/models',
  },
  {
    icon: WorkflowIcon,
    title: 'Saga workflows',
    body: 'A workflow engine built on Effect-TS with compensation, retries, and distributed locks — orchestrate multi-step operations that fail gracefully.',
    href: '/docs/workflows',
  },
  {
    icon: ZapIcon,
    title: 'Redis utilities',
    body: 'Batteries-included cache, queues, locks, sessions, and rate limiting — wired up the moment you set a REDIS_URL.',
    href: '/docs/redis',
  },
  {
    icon: RouteIcon,
    title: 'File-based HTTP',
    body: 'Define endpoints with file-based routing on top of Hono. Handlers, middleware, and validation compose cleanly per module.',
    href: '/docs/http-apis',
  },
  {
    icon: TerminalIcon,
    title: 'Unified CLI',
    body: 'One `damat` command for dev, build, migrations, codegen, and module management — plus an MCP server so an AI can install modules for you.',
    href: '/docs/cli-reference',
  },
]

const builtOn = ['Bun', 'Hono', 'Effect-TS', 'Better Auth', 'PostgreSQL']

const packageMap = [
  { group: 'App framework', items: ['framework', 'services', 'module', 'link', 'workflow-engine'] },
  { group: 'ORM', items: ['orm', 'orm-model', 'orm-pg', 'orm-migration', 'codegen'] },
  { group: 'Core', items: ['logger', 'redis', 'load-env', 'types', 'cli'] },
  { group: 'CLIs & AI', items: ['damat-cli', 'orm-cli', 'create-damat-app', 'mcp'] },
]

export default async function HomePage() {
  const configHtml = await highlightCode(CONFIG_SAMPLE, 'ts')

  return (
    <>
      {/* ---- Hero -------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div
          className="pointer-events-none absolute left-1/2 top-[-10rem] h-[32rem] w-[52rem] -translate-x-1/2 rounded-full opacity-[0.18] blur-3xl"
          style={{ background: 'radial-gradient(closest-side, #f5900f, transparent)' }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-[90rem] px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Link
              href="/docs/concepts"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3.5 py-1.5 text-sm text-muted shadow-sm backdrop-blur transition-colors hover:border-line-strong hover:text-ink"
            >
              <SparklesIcon width={14} height={14} className="text-brand" />
              Backends composed from modules
              <ArrowRightIcon width={13} height={13} />
            </Link>

            <h1 className="mt-7 text-balance text-[2.6rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Compose your backend
              <br className="hidden sm:block" /> from{' '}
              <span className="text-gradient">independent blades</span>.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted">
              Damat is a composable backend framework for TypeScript, built on Bun. Assemble exactly
              what your app needs from plug-and-play modules — database, auth, billing, queues,
              workflows — each self-contained and installable with one command.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/docs/getting-started"
                className="inline-flex h-12 items-center gap-2 rounded-xl accent-gradient px-6 font-medium text-white shadow-lg shadow-accent-500/25 transition-transform hover:scale-[1.02]"
              >
                Get started
                <ArrowRightIcon width={16} height={16} />
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-line bg-surface px-6 font-medium text-ink transition-colors hover:bg-subtle"
              >
                <GitHubIcon width={17} height={17} />
                View on GitHub
              </a>
            </div>

            <div className="mx-auto mt-8 flex max-w-md items-center justify-between gap-3 rounded-xl border border-line bg-surface/80 py-1 pl-4 pr-1 font-mono text-sm shadow-sm backdrop-blur">
              <span className="truncate">
                <span className="select-none text-brand">$ </span>
                <span className="text-ink">{INSTALL}</span>
              </span>
              <CopyButton text={INSTALL} />
            </div>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <span className="text-xs uppercase tracking-[0.12em] text-faint">Built on</span>
            {builtOn.map((name) => (
              <span key={name} className="text-sm font-medium text-muted">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Features ---------------------------------------------------- */}
      <section className="mx-auto max-w-[90rem] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything a backend needs, nothing it doesn&apos;t
          </h2>
          <p className="mt-4 text-lg text-muted">
            Instead of fighting a monolith&apos;s opinions, you assemble the building blocks your app
            actually uses.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className="group relative flex flex-col rounded-2xl border border-line bg-surface p-6 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lg"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand/25 bg-brand/10 text-brand">
                <f.icon width={20} height={20} />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 flex-1 text-[0.925rem] leading-relaxed text-muted">{f.body}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
                Learn more
                <ArrowRightIcon width={14} height={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---- How it composes -------------------------------------------- */}
      <section className="border-y border-line bg-subtle/40">
        <div className="mx-auto grid max-w-[90rem] items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-brand">
              One config, fully wired
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Register modules by id. Damat does the wiring.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              A single <code className="rounded bg-brand/10 px-1.5 py-0.5 font-mono text-[0.85em] text-ink">damat.config.ts</code>{' '}
              declares your project config and the modules you want. At startup Damat connects each
              module to the database and HTTP server — models, migrations, services, routes, and
              workflows included.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Modules are portable — author one in isolation, install it into any app.',
                'Installing a module updates this block for you and syncs its env vars.',
                'Compose and link modules so one can depend on another’s service.',
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-[0.95rem] text-muted">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                    <LayersIcon width={12} height={12} />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
            <Link
              href="/docs/composing-and-linking-modules"
              className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"
            >
              How composing &amp; linking works
              <ArrowRightIcon width={14} height={14} />
            </Link>
          </div>

          <div className="lg:pl-6">
            <CodeCard html={configHtml} code={CONFIG_SAMPLE} filename="damat.config.ts" />
          </div>
        </div>
      </section>

      {/* ---- Package map ------------------------------------------------- */}
      <section className="mx-auto max-w-[90rem] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">A tidy package map</h2>
          <p className="mt-4 text-lg text-muted">
            Damat is a Bun + Turborepo monorepo. You rarely import most packages directly — but
            everything is documented.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {packageMap.map((col) => (
            <div key={col.group} className="rounded-2xl border border-line bg-surface p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.09em] text-faint">
                {col.group}
              </p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {col.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-md border border-line bg-subtle px-2 py-1 font-mono text-[0.75rem] text-muted"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/docs/package-reference"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"
          >
            Full package reference
            <ArrowRightIcon width={14} height={14} />
          </Link>
        </div>
      </section>

      {/* ---- CTA --------------------------------------------------------- */}
      <section className="mx-auto max-w-[90rem] px-4 pb-24 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-16 text-center">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12] blur-2xl"
            style={{ background: 'radial-gradient(closest-side at 50% 0%, #f5900f, transparent)' }}
            aria-hidden="true"
          />
          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Build a modular backend in minutes
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
              Scaffold an app, define a model, install a module, ship. The guide walks you from zero
              to a running backend.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/docs/introduction"
                className="inline-flex h-12 items-center gap-2 rounded-xl accent-gradient px-6 font-medium text-white shadow-lg shadow-accent-500/25 transition-transform hover:scale-[1.02]"
              >
                Read the guide
                <ArrowRightIcon width={16} height={16} />
              </Link>
              <div className="inline-flex h-12 items-center gap-3 rounded-xl border border-line bg-canvas px-4 font-mono text-sm">
                <span className="truncate">
                  <span className="select-none text-brand">$ </span>
                  {INSTALL}
                </span>
                <CopyButton text={INSTALL} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
