'use client'

import { CopyButton } from './CopyButton'

/** A standalone highlighted code sample with a filename bar and copy button. */
export function CodeCard({
  html,
  code,
  filename,
}: {
  html: string
  code: string
  filename: string
}) {
  return (
    <figure className="code-block shadow-xl">
      <figcaption className="code-block__bar">
        <span className="code-block__lang normal-case tracking-normal">{filename}</span>
        <CopyButton text={code} />
      </figcaption>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  )
}
