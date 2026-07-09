import { ShieldCheckIcon } from "@/assets/icons/shieldCheck";
import type { Module } from "@/lib/registry";

/** Status pill for a module's verification state. */
export function VerifiedBadge({
  module,
  className = "",
}: {
  module: Module;
  className?: string;
}) {
  const base = `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-medium ${className}`;

  if (module.verified) {
    return (
      <span
        title={
          module.verifiedBy ? `Verified by ${module.verifiedBy}` : "Verified"
        }
        className={`badge-ok ${base}`}
      >
        <ShieldCheckIcon width={12} height={12} />
        Verified
      </span>
    );
  }

  if (module.status === "rejected" || module.status === "revoked") {
    return (
      <span
        title={
          module.reason ??
          "Blocked by the registry — installs are always refused."
        }
        className={`badge-danger ${base} capitalize`}
      >
        {module.status}
      </span>
    );
  }

  const label = module.status === "unverified" ? "Community" : module.status;
  return (
    <span
      title={
        module.reason ?? "This module has not been verified by the registry."
      }
      className={`${base} border-line capitalize text-faint`}
    >
      {label}
    </span>
  );
}
