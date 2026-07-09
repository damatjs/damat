import type { Metadata } from "next";
import { getModules } from "@/lib/registry";
import { SITE } from "@/lib/site";
import { breadcrumbJsonLd } from "@/lib/utils/jsonLd";
import { BrowseTemplate } from "@/modules/registry/templates/browse";

export const metadata: Metadata = {
  title: "Browse modules",
  description:
    "Discover and install Damat modules — self-contained backend building blocks. Each entry carries an owner and verification status, and installs with a single command.",
  alternates: { canonical: `${SITE.url}/modules` },
  openGraph: {
    images: [
      `${SITE.url}/og?title=${encodeURIComponent("Browse Damat modules")}`,
    ],
  },
};

export default function ModulesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD built from typed constants — no user input
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([{ name: "Modules", path: "/modules" }]),
          ),
        }}
      />
      <BrowseTemplate modules={getModules()} />
    </>
  );
}
