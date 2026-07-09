import { getNav } from "@/lib/content";
import { CodeEnhancer } from "@/modules/docs/components/codeEnhancer";
import { Sidebar } from "@/modules/docs/components/sidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sections = getNav();

  return (
    <div className="mx-auto flex max-w-shell px-4 sm:px-5 lg:px-6">
      <div
        className="stripes hidden w-4 shrink-0 border-x border-line lg:block"
        aria-hidden="true"
      />
      <Sidebar sections={sections} />
      <div
        className="stripes hidden w-4 shrink-0 border-x border-line lg:block"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 lg:pl-8">{children}</div>
      <div
        className="stripes hidden w-4 shrink-0 border-x border-line xl:block"
        aria-hidden="true"
      />
      <CodeEnhancer />
    </div>
  );
}
