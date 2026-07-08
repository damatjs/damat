'use client'

import { useState } from 'react'
import { CheckIcon, CopyIcon } from './icons'

export function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy to clipboard"
      className={`flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-subtle hover:text-ink ${className}`}
    >
      {copied ? <CheckIcon width={15} height={15} className="text-brand" /> : <CopyIcon width={15} height={15} />}
    </button>
  )
}
