import Link from 'next/link'
import { ArrowRightIcon } from '@/assets/icons/arrowRight'
import { DOCS_PATH } from '@/lib/constants'
import { InstallCommand } from '@/modules/common/components/installCommand'

export function Cta() {
  return (
    <section className="grid items-center gap-8 border-t border-line px-6 py-16 lg:grid-cols-2 lg:px-10">
      <div>
        <h2 className="display text-3xl font-semibold text-ink sm:text-4xl">
          Start with one command.
        </h2>
        <p className="mt-3 max-w-md text-base leading-relaxed text-muted">
          Scaffold an app, define a model, install a module, ship. The guide
          takes you from zero to a running backend.
        </p>
      </div>
      <div className="flex flex-col items-start gap-3 lg:items-end">
        <InstallCommand className="w-full max-w-md justify-between" />
        <Link
          href={`${DOCS_PATH}/introduction`}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-canvas transition-opacity hover:opacity-85"
        >
          Read the guide
          <ArrowRightIcon width={15} height={15} />
        </Link>
      </div>
    </section>
  )
}
