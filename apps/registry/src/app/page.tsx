import { getModules } from '@/lib/registry'
import { SITE, DOCS_URL } from '@/lib/site'
import { ModuleGrid } from '@/components/ModuleGrid'
import { CopyButton } from '@/components/CopyButton'
import { ArrowRightIcon, ShieldCheckIcon, TerminalIcon } from '@/components/icons'

const INDEX_URL = `${SITE.url}/index.json`

export default function HomePage() {
  const modules = getModules()
  const verified = modules.filter((m) => m.verified).length
  const example = modules[0]
  const exampleInstall = example ? `damat module add ${example.installRef}` : 'damat module add <module>'

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div
          className="pointer-events-none absolute left-1/2 top-[-8rem] h-[26rem] w-[44rem] -translate-x-1/2 rounded-full opacity-[0.18] blur-3xl"
          style={{ background: 'radial-gradient(closest-side, #f5900f, transparent)' }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-16 text-center sm:px-6 sm:pt-20 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3.5 py-1.5 text-sm text-muted shadow-sm backdrop-blur">
            <ShieldCheckIcon width={14} height={14} className="text-brand" />
            Owner &amp; verification on every module
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-[2.4rem] font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            The <span className="text-gradient">module registry</span> for Damat
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-lg leading-relaxed text-muted">
            Discover self-contained backend building blocks — auth, billing, teams, webhooks — and
            install any of them into your app with one command.
          </p>

          {/* Endpoint */}
          <div className="mx-auto mt-8 flex max-w-lg items-center justify-between gap-3 rounded-xl border border-line bg-surface/80 py-1 pl-4 pr-1 font-mono text-sm shadow-sm backdrop-blur">
            <a href="/index.json" className="truncate text-muted hover:text-ink">
              {INDEX_URL}
            </a>
            <CopyButton text={INDEX_URL} />
          </div>
          <div className="mt-4 flex items-center justify-center gap-5 text-sm text-faint">
            <span>
              <strong className="text-ink">{modules.length}</strong> module
              {modules.length === 1 ? '' : 's'}
            </span>
            <span className="h-3 w-px bg-line-strong" />
            <span>
              <strong className="text-ink">{verified}</strong> verified
            </span>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ModuleGrid modules={modules} />
      </section>

      {/* How it works */}
      <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-line bg-subtle/40 p-8 sm:p-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Point the CLI at the registry, then install
            </h2>
            <p className="mt-3 text-muted">
              Set <code className="rounded bg-brand/10 px-1.5 py-0.5 font-mono text-[0.85em] text-ink">DAMAT_MODULE_REGISTRY</code>{' '}
              to this registry&apos;s index, then add any module by its ref.
            </p>
          </div>

          <div className="mx-auto mt-8 grid max-w-3xl gap-4">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/15 font-mono text-[0.7rem] text-brand">
                  1
                </span>
                Configure the registry
              </p>
              <div className="cmd">
                <span className="truncate text-ink">
                  export DAMAT_MODULE_REGISTRY={INDEX_URL}
                </span>
                <CopyButton text={`export DAMAT_MODULE_REGISTRY=${INDEX_URL}`} />
              </div>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/15 font-mono text-[0.7rem] text-brand">
                  2
                </span>
                Install a module
              </p>
              <div className="cmd">
                <span className="truncate text-ink">
                  <span className="select-none text-brand">$ </span>
                  {exampleInstall}
                </span>
                <CopyButton text={exampleInstall} />
              </div>
            </div>
          </div>

          <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={`${DOCS_URL}/docs/installing-modules`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"
            >
              <TerminalIcon width={15} height={15} />
              Installing modules
              <ArrowRightIcon width={14} height={14} />
            </a>
            <span className="hidden text-line-strong sm:inline">·</span>
            <a
              href={`${DOCS_URL}/docs/authoring-modules`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"
            >
              Publish your own module
              <ArrowRightIcon width={14} height={14} />
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
