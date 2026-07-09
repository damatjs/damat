import Link from 'next/link'
import { ArrowRightIcon } from '@/assets/icons/arrowRight'
import { CheckIcon } from '@/assets/icons/check'
import { DOCS_PATH } from '@/lib/constants'
import { highlightCode } from '@/lib/utils/highlight'
import { SectionHeader } from '@/modules/layout/components/sectionHeader'
import { CodeTabs } from '@/modules/home/components/codeWalkthrough/tabs'
import {
  MODEL_SAMPLE,
  ROUTE_SAMPLE,
  SERVICE_SAMPLE,
  WORKFLOW_SAMPLE,
} from '@/modules/home/components/codeWalkthrough/samples'

const POINTS = [
  'Table names are the source of truth — keys, routes, and relations derive from them.',
  'Services extend generated CRUD with your domain methods and transactions.',
  'Compensation runs in reverse when a workflow step fails.',
]

export async function CodeWalkthrough() {
  const [modelHtml, serviceHtml, routeHtml, workflowHtml] = await Promise.all([
    highlightCode(MODEL_SAMPLE),
    highlightCode(SERVICE_SAMPLE),
    highlightCode(ROUTE_SAMPLE),
    highlightCode(WORKFLOW_SAMPLE),
  ])

  const tabs = [
    { id: 'model', label: 'Model', filename: 'src/modules/user/models/user.ts', html: modelHtml, code: MODEL_SAMPLE },
    { id: 'service', label: 'Service', filename: 'src/modules/user/service.ts', html: serviceHtml, code: SERVICE_SAMPLE },
    { id: 'route', label: 'Route', filename: 'src/api/routes/users/[userId]/route.ts', html: routeHtml, code: ROUTE_SAMPLE },
    { id: 'workflow', label: 'Workflow', filename: 'src/modules/user/workflows/onboarding.ts', html: workflowHtml, code: WORKFLOW_SAMPLE },
  ]

  return (
    <section className="border-t border-line bg-subtle/60 px-6 py-20 lg:px-10">
      <SectionHeader eyebrow="Developer experience" title="A module, end to end.">
        Real Damat code, not pseudocode. Define a model and the table,
        migration, and CRUD service come with it. Add a route file and it
        mounts. Failed workflow steps roll themselves back.
      </SectionHeader>

      <div className="mt-12 grid items-start gap-10 lg:grid-cols-[0.62fr_1fr]">
        <div className="lg:sticky lg:top-24">
          <ul className="space-y-3 text-md text-muted">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <CheckIcon width={15} height={15} className="mt-1 shrink-0 text-brand" />
                {point}
              </li>
            ))}
          </ul>
          <Link
            href={`${DOCS_PATH}/getting-started`}
            className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-ink hover:text-brand"
          >
            Follow the guide from zero
            <ArrowRightIcon width={14} height={14} />
          </Link>
        </div>

        <CodeTabs tabs={tabs} />
      </div>
    </section>
  )
}
