import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { AgentsTemplate } from "@/modules/marketing/templates/agents";

const TITLE = "Agents — the verdict API for AI installs";
const DESCRIPTION =
  "AI agents query a per-version trust verdict — status, score, reasons, summary — before installing. MCP tools carry verification and verdicts built in.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE.url}/agents` },
  openGraph: {
    images: [
      `${SITE.url}/og?title=${encodeURIComponent("Your agent asks before it installs")}&eyebrow=${encodeURIComponent("agents")}`,
    ],
  },
};

export default function AgentsPage() {
  return <AgentsTemplate />;
}
