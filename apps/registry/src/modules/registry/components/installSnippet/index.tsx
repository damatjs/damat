import { cn } from "@/lib/utils";
import { CopyButton } from "@/modules/common/components/copyButton";

/** A copyable `$ command` chip in the shared cmd style. */
export function InstallSnippet({
  command,
  className,
}: {
  command: string;
  className?: string;
}) {
  return (
    <div className={cn("cmd", className)}>
      <span className="truncate text-ink">
        <span className="select-none text-brand">$ </span>
        {command}
      </span>
      <CopyButton text={command} />
    </div>
  );
}
