import { INSTALL_COMMAND } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/modules/common/components/copyButton";

/** The scaffold command as a copyable mono chip. */
export function InstallCommand({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-10 items-center gap-2 rounded-lg border border-line bg-subtle pl-3.5 pr-1 font-mono text-code text-muted",
        className,
      )}
    >
      <span className="select-none text-brand">$</span>
      <span className="hidden truncate text-ink sm:inline">
        {INSTALL_COMMAND}
      </span>
      <span className="truncate text-ink sm:hidden">damat create</span>
      <CopyButton text={INSTALL_COMMAND} />
    </span>
  );
}
