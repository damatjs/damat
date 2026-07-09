import type { Module } from '@/lib/registry'
import { ShieldCheckIcon } from './icons'

export function VerifiedBadge({ module, className = '' }: { module: Module; className?: string }) {
  if (module.verified) {
    return (
      <span
        title={module.verifiedBy ? `Verified by ${module.verifiedBy}` : 'Verified'}
        className={`badge-ok inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-medium ${className}`}
      >
        <ShieldCheckIcon width={12} height={12} />
        Verified
      </span>
    )
  }

  const label = module.status === 'unverified' ? 'Unverified' : module.status
  return (
    <span
      title={module.reason ?? 'This module has not been verified by the registry.'}
      className={`inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-2xs font-medium capitalize text-faint ${className}`}
    >
      {label}
    </span>
  )
}
