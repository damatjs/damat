import { createHighlighter, type Highlighter } from 'shiki'

let highlighterPromise: Promise<Highlighter> | null = null

function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: ['github-dark-dimmed'],
    langs: ['typescript'],
  })
  return highlighterPromise
}

/** Highlight a TypeScript sample for rendering inside a forge (dark) panel. */
export async function highlightCode(code: string): Promise<string> {
  const highlighter = await getHighlighter()
  return highlighter.codeToHtml(code, {
    lang: 'typescript',
    themes: { dark: 'github-dark-dimmed' },
    defaultColor: false,
  })
}
