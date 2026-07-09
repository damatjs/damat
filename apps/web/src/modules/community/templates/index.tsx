import { GitHubIcon } from "@/assets/icons/gitHub";
import { GITHUB_URL } from "@/lib/constants";
import { Channels } from "@/modules/community/components/channels";
import { Contribute } from "@/modules/community/components/contribute";
import { PageHeader } from "@/modules/layout/components/pageHeader";

/** /community — how to follow, discuss, and contribute to the project. */
export function CommunityTemplate() {
  return (
    <div className="mx-auto max-w-7xl border-line lg:border-x">
      <PageHeader eyebrow="Community" title="Built in the open.">
        Damat is MIT-licensed and developed entirely on GitHub — code, docs,
        release notes, and the module registry index all live in one monorepo.
        Star it to follow along, or pick a way in below.
      </PageHeader>

      <div className="px-6 pb-14 lg:px-10">
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-subtle"
        >
          <GitHubIcon width={15} height={15} />
          damatjs/damat on GitHub
        </a>
      </div>

      <Channels />
      <Contribute />
    </div>
  );
}
