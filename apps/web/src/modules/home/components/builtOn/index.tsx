import { cn } from '@/lib/utils'

const STACK = ['Bun', 'Hono', 'Effect-TS', 'PostgreSQL', 'Redis', 'TypeScript']

/** Hairline-divided wall of the stack Damat is built on. */
export function BuiltOn() {
  return (
    <section className="grid grid-cols-2 border-t border-line sm:grid-cols-3 lg:grid-cols-6">
      {STACK.map((name, i) => (
        <div
          key={name}
          className={cn(
            'flex h-20 items-center justify-center border-line text-md font-medium text-faint',
            i % 2 === 1 && 'border-l sm:border-l-0',
            i % 3 !== 0 && 'sm:border-l',
            i >= 2 && 'border-t sm:border-t-0',
            i >= 3 && 'sm:border-t lg:border-t-0',
            i > 0 && 'lg:border-l',
          )}
        >
          {name}
        </div>
      ))}
    </section>
  )
}
