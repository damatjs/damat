import { CheckIcon } from '@/assets/icons/check'
import { ConfigPane } from '@/modules/home/components/workbench/configPane'
import { Terminal } from '@/modules/home/components/workbench/terminal'

const RAIL = ['models', 'migrations', 'routes', 'workflows', 'env vars']

/** The hero product shot: a terminal installing a module while the app
 *  config lights up with the wired result. One-shot CSS choreography. */
export function Workbench() {
  return (
    <section className="border-t border-line bg-subtle/60 px-6 py-14 lg:px-10">
      <div className="land workbench-land relative">
        <div className="forge relative overflow-hidden rounded-xl border border-line bg-canvas shadow-2xl shadow-black/20">
          <div className="heat-line absolute inset-x-10 top-0" aria-hidden="true" />

          <div className="flex items-center gap-2 border-b border-line px-5 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-iron-800" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-iron-800" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-iron-800" aria-hidden="true" />
            <span className="ml-3 font-mono text-xs text-faint">my-app</span>
            <span className="ml-auto font-mono text-2xs uppercase tracking-widest text-faint">
              one command, fully wired
            </span>
          </div>

          <div className="grid lg:grid-cols-[1.02fr_1fr] lg:divide-x lg:divide-line">
            <div className="min-w-0 border-b border-line lg:border-b-0">
              <div className="border-b border-line px-5 py-2 font-mono text-xs text-faint">
                terminal
              </div>
              <Terminal />
            </div>
            <div className="min-w-0">
              <div className="border-b border-line px-5 py-2 font-mono text-xs text-faint">
                damat.config.ts
              </div>
              <ConfigPane />
            </div>
          </div>

          <div className="rail-seq flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-5 py-3.5">
            <span className="font-mono text-2xs uppercase tracking-widest text-faint">
              wired at startup
            </span>
            {RAIL.map((item) => (
              <span key={item} className="land flex items-center gap-1.5 font-mono text-xs text-muted">
                <CheckIcon width={12} height={12} className="text-code-ok" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
