'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Progressively enhances Shiki-highlighted `<pre>` blocks (rendered as static
 * HTML) with a language label and a copy button. Runs after each navigation.
 */
export function CodeEnhancer() {
  const pathname = usePathname()

  useEffect(() => {
    const container = document.querySelector('[data-doc-content]')
    if (!container) return

    const blocks = Array.from(container.querySelectorAll<HTMLPreElement>('pre.shiki'))
    const cleanups: Array<() => void> = []

    for (const pre of blocks) {
      if (pre.parentElement?.classList.contains('code-block')) continue

      const wrapper = document.createElement('figure')
      wrapper.className = 'code-block'
      pre.replaceWith(wrapper)

      const bar = document.createElement('figcaption')
      bar.className = 'code-block__bar'

      const lang = document.createElement('span')
      lang.className = 'code-block__lang'
      lang.textContent = pre.getAttribute('data-lang') || 'code'

      const copy = document.createElement('button')
      copy.type = 'button'
      copy.className = 'code-block__copy'
      copy.textContent = 'Copy'

      const onClick = async () => {
        try {
          await navigator.clipboard.writeText(pre.innerText)
          copy.textContent = 'Copied'
          window.setTimeout(() => {
            copy.textContent = 'Copy'
          }, 1600)
        } catch {
          /* clipboard unavailable */
        }
      }
      copy.addEventListener('click', onClick)
      cleanups.push(() => copy.removeEventListener('click', onClick))

      bar.append(lang, copy)
      wrapper.append(bar, pre)
    }

    return () => cleanups.forEach((fn) => fn())
  }, [pathname])

  return null
}
