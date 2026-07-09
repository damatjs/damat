import { BuiltOn } from '@/modules/home/components/builtOn'
import { Capabilities } from '@/modules/home/components/capabilities'
import { CodeWalkthrough } from '@/modules/home/components/codeWalkthrough'
import { Cta } from '@/modules/home/components/cta'
import { Hero } from '@/modules/home/components/hero'
import { OpenSource } from '@/modules/home/components/openSource'
import { Pillars } from '@/modules/home/components/pillars'
import { RegistrySection } from '@/modules/home/components/registrySection'
import { Workbench } from '@/modules/home/components/workbench'

/** Home page template — orchestrates the sections inside the hairline frame. */
export function HomeTemplate() {
  return (
    <div className="mx-auto max-w-7xl border-line lg:border-x">
      <Hero />
      <Pillars />
      <Workbench />
      <BuiltOn />
      <Capabilities />
      <CodeWalkthrough />
      <RegistrySection />
      <OpenSource />
      <Cta />
    </div>
  )
}
