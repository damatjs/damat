import { CodeText } from "@/modules/common/components/codeText";
import { FAQ_ITEMS } from "@/modules/home/components/faq/data";
import { SectionHeader } from "@/modules/layout/components/sectionHeader";

/** Native details/summary accordion — no client JS needed. */
export function Faq() {
  return (
    <section className="border-t border-line px-6 py-20 lg:px-10">
      <SectionHeader eyebrow="FAQ" title="Questions, answered.">
        The short version of what people ask first. Everything here is covered
        in depth in the guide.
      </SectionHeader>

      <div className="mt-12 divide-y divide-line overflow-hidden rounded-xl border border-line">
        {FAQ_ITEMS.map((item) => (
          <details key={item.question} className="group bg-canvas">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-ink transition-colors hover:bg-subtle sm:px-6 [&::-webkit-details-marker]:hidden">
              {item.question}
              <span
                aria-hidden="true"
                className="text-faint transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="max-w-3xl px-5 pb-5 text-sm leading-relaxed text-muted sm:px-6">
              <CodeText text={item.answer} />
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
