import { getNav } from '@/lib/content'
import { Sidebar } from '@/components/Sidebar'
import { CodeEnhancer } from '@/components/CodeEnhancer'

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const sections = getNav()

  return (
    <div className="mx-auto flex max-w-[90rem] gap-8 px-4 sm:px-6 lg:px-8">
      <Sidebar sections={sections} />
      <div className="min-w-0 flex-1">{children}</div>
      <CodeEnhancer />
    </div>
  )
}
