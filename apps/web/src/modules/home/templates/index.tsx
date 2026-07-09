import type { RegistryModule } from "@/lib/data/registry";
import type { ReleaseGroup } from "@/lib/data/releases";
import type { SiteStats } from "@/lib/data/stats";
import { BuiltOn } from "@/modules/home/components/builtOn";
import { Capabilities } from "@/modules/home/components/capabilities";
import { CodeWalkthrough } from "@/modules/home/components/codeWalkthrough";
import { Cta } from "@/modules/home/components/cta";
import { Faq } from "@/modules/home/components/faq";
import { Hero } from "@/modules/home/components/hero";
import { OpenSource } from "@/modules/home/components/openSource";
import { Pillars } from "@/modules/home/components/pillars";
import { RegistrySection } from "@/modules/home/components/registrySection";
import { ReleasesStrip } from "@/modules/home/components/releasesStrip";
import { Workbench } from "@/modules/home/components/workbench";

/** Home page template — orchestrates the sections inside the hairline frame. */
export function HomeTemplate({
  modules,
  releaseGroups,
  stats,
}: {
  modules: RegistryModule[];
  releaseGroups: ReleaseGroup[];
  stats: SiteStats;
}) {
  return (
    <div className="mx-auto max-w-7xl border-line lg:border-x">
      <Hero />
      <Pillars />
      <Workbench />
      <BuiltOn />
      <Capabilities />
      <CodeWalkthrough />
      <RegistrySection modules={modules} />
      <ReleasesStrip groups={releaseGroups} />
      <OpenSource stats={stats} />
      <Faq />
      <Cta />
    </div>
  );
}
