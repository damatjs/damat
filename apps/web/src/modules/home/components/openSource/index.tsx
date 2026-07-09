import { GitHubIcon } from '@/assets/icons/gitHub'
import { GITHUB_URL } from '@/lib/constants'

const STATS: Array<[string, string]> = [
  ['MIT', 'licensed'],
  ['19', 'packages, one monorepo'],
  ['21', 'guide chapters'],
]

export function OpenSource() {
  return (
    <section className="border-t border-line px-6 py-24 lg:px-10">
      <p className="eyebrow">Open source</p>
      <h2 className="display mt-4 max-w-3xl text-4xl font-medium leading-heading text-ink sm:text-5xl">
        Own every layer. Read every line. Replace any module.
      </h2>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
        Damat is MIT licensed and built in the open — from the ORM to the
        workflow engine to the CLI, every layer is yours to read, fork, and
        extend.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-x-12 gap-y-6">
        {STATS.map(([value, label]) => (
          <div key={label}>
            <p className="display text-3xl font-medium text-ink">{value}</p>
            <p className="mt-1 text-sm text-muted">{label}</p>
          </div>
        ))}
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-subtle sm:ml-auto"
        >
          <GitHubIcon width={15} height={15} />
          Star on GitHub
        </a>
      </div>
    </section>
  )
}
