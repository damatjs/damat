import Link from 'next/link'
import { ArrowRightIcon } from '@/assets/icons/arrowRight'

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 border-line px-6 py-32 lg:border-x lg:px-10">
      <p className="eyebrow">404</p>
      <h1 className="display text-4xl font-medium text-ink">Page not found.</h1>
      <p className="max-w-md text-muted">
        The page you are looking for does not exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-canvas transition-opacity hover:opacity-85"
      >
        Back home
        <ArrowRightIcon width={15} height={15} />
      </Link>
    </div>
  )
}
