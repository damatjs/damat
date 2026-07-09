import { GITHUB_URL } from "@/lib/constants";

/** Where the project actually happens — all of it on GitHub, in the open. */
const CHANNELS = [
  {
    title: "Discussions",
    href: `${GITHUB_URL}/discussions`,
    body: "Ask questions, share what you are building, and propose ideas before they become issues.",
    cta: "Join the conversation",
  },
  {
    title: "Issues",
    href: `${GITHUB_URL}/issues`,
    body: "Found a bug or a rough edge? File it with a repro — triaged in the open like everything else.",
    cta: "Report an issue",
  },
  {
    title: "Pull requests",
    href: `${GITHUB_URL}/pulls`,
    body: "Fixes, docs, and new registry entries all land the same way. Small, focused PRs review fastest.",
    cta: "Open a pull request",
  },
];

export function Channels() {
  return (
    <section
      aria-label="Community channels"
      className="border-t border-line px-6 py-16 lg:px-10"
    >
      <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
        {CHANNELS.map((channel) => (
          <a
            key={channel.title}
            href={channel.href}
            target="_blank"
            rel="noreferrer noopener"
            className="group flex flex-col bg-canvas p-5 transition-colors hover:bg-subtle sm:p-6"
          >
            <h2 className="text-base font-medium text-ink">{channel.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
              {channel.body}
            </p>
            <span className="mt-4 text-sm font-medium text-ink group-hover:text-brand">
              {channel.cta} ↗
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
