import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { SecurityTemplate } from "@/modules/marketing/templates/security";

const TITLE = "Security — scan, score, gate";
const DESCRIPTION =
  "Every package version is owner-verified, statically scanned, and AI-read, then given a 0–100 trust verdict your workspace policy gates installs on.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE.url}/security` },
  openGraph: {
    images: [
      `${SITE.url}/og?title=${encodeURIComponent("Every version earns a verdict")}&eyebrow=${encodeURIComponent("security")}`,
    ],
  },
};

export default function SecurityPage() {
  return <SecurityTemplate />;
}
