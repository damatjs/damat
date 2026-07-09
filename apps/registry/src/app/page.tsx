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
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-14 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 text-sm text-muted">
            <ShieldCheckIcon width={14} height={14} className="text-brand" />
            Owner &amp; verification on every module
          </span>

          <h1 className="mt-5 max-w-3xl text-4xl font-medium leading-tight tracking-tight text-ink sm:text-5xl">
            The module registry for Damat
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            Discover self-contained backend building blocks — auth, billing, teams, webhooks — and
            install any of them into your app with one command.
          </p>

          {/* Endpoint */}
          <div className="mt-8 flex max-w-lg items-center justify-between gap-3 rounded-lg border border-line bg-subtle py-0.5 pl-4 pr-1 font-mono text-sm">
            <a href="/index.json" className="truncate text-muted hover:text-ink">
              {INDEX_URL}
            </a>
            <CopyButton text={INDEX_URL} />
          </div>
          <div className="mt-4 flex items-center gap-5 text-sm text-faint">
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
      <section id="modules" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <ModuleGrid modules={modules} />
      </section>

      {/* How it works */}
      <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-line bg-subtle/60 p-8 sm:p-12">
          <div className="max-w-2xl">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Point the CLI at the registry, then install
            </h2>
            <p className="mt-3 text-muted">
              Set <code className="rounded bg-brand/10 px-1.5 py-0.5 font-mono text-[0.85em] text-ink">DAMAT_MODULE_REGISTRY</code>{' '}
              to this registry&apos;s index, then add any module by its ref.
            </p>
          </div>

          <div className="mt-8 grid max-w-3xl gap-4">
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

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
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
