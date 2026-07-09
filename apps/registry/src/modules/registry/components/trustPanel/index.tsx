import { ShieldCheckIcon } from "@/assets/icons/shieldCheck";
import type { Module } from "@/lib/registry";

const STATUS_COPY: Record<Module["status"], string> = {
  verified:
    "Reviewed by the registry — the source is pinned and the owner is confirmed. Installs cleanly under every policy.",
  unverified:
    "Listed but not reviewed. Whether it installs depends on your DAMAT_MODULE_VERIFY policy.",
  pending:
    "Review in progress. Treated like unverified until the registry stamps it.",
  rejected:
    "Blocked by the registry. Installs are always refused, regardless of policy.",
  revoked:
    "Previously listed, now revoked by the registry. Installs are always refused, regardless of policy.",
};

const POLICIES: Array<[string, string]> = [
  ["off", "install anything the registry serves"],
  ["warn (default)", "install, but print what you are trusting"],
  ["require", "only verified entries install"],
];

/** Explains what this module's verification status means at install time. */
export function TrustPanel({ module }: { module: Module }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <ShieldCheckIcon width={15} height={15} className="text-brand" />
        <span className="capitalize">{module.status}</span>
        {module.verifiedBy && (
          <span className="font-mono text-2xs text-faint">
            by {module.verifiedBy}
          </span>
        )}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {STATUS_COPY[module.status]}
      </p>
      {module.reason && (
        <p className="mt-2 rounded-lg bg-subtle px-3 py-2 text-sm text-muted">
          Registry note: {module.reason}
        </p>
      )}

      <p className="mt-4 font-mono text-2xs font-medium uppercase tracking-widest text-faint">
        Your install gate — DAMAT_MODULE_VERIFY
      </p>
      <dl className="mt-2 divide-y divide-line border-t border-line">
        {POLICIES.map(([policy, meaning]) => (
          <div key={policy} className="flex items-baseline gap-3 py-2">
            <dt className="w-28 shrink-0 font-mono text-code text-ink">
              {policy}
            </dt>
            <dd className="text-sm text-muted">{meaning}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
