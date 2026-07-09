import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { HostingTemplate } from "@/modules/marketing/templates/hosting";

const TITLE = "Hosting — any package, two install channels";
const DESCRIPTION =
  "Publish any npm-shaped package to the registry. Install it as a normal dependency or vendor its source straight into your tree — same artifact, same safety gate.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE.url}/hosting` },
  openGraph: {
    images: [
      `${SITE.url}/og?title=${encodeURIComponent("Host any package with us")}&eyebrow=${encodeURIComponent("hosting")}`,
    ],
  },
};

export default function HostingPage() {
  return <HostingTemplate />;
}
