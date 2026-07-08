import path from 'node:path'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeStringify from 'rehype-stringify'
import { visit, SKIP } from 'unist-util-visit'
import type { Root, Element, ElementContent, Nodes } from 'hast'
import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import githubLight from 'shiki/themes/github-light.mjs'
import githubDark from 'shiki/themes/github-dark-dimmed.mjs'
import tsLang from 'shiki/langs/typescript.mjs'
import tsxLang from 'shiki/langs/tsx.mjs'
import jsLang from 'shiki/langs/javascript.mjs'
import jsxLang from 'shiki/langs/jsx.mjs'
import jsonLang from 'shiki/langs/json.mjs'
import bashLang from 'shiki/langs/bash.mjs'
import sqlLang from 'shiki/langs/sql.mjs'
import yamlLang from 'shiki/langs/yaml.mjs'
import mdLang from 'shiki/langs/markdown.mjs'
import diffLang from 'shiki/langs/diff.mjs'

import { GITHUB_BLOB } from './repo'
import type { TocEntry } from './types'

export type { TocEntry }

export interface RenderContext {
  /** Repo-relative path of the source file, e.g. `docs/guide/01-introduction.md`. */
  sourcePath: string
  /** Map of source-file basename → in-site route, e.g. `02-concepts.md` → `/docs/concepts`. */
  slugMap: Record<string, string>
}

const LANG_ALIASES: Record<string, string> = {
  ts: 'typescript',
  typescript: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  javascript: 'javascript',
  jsx: 'jsx',
  json: 'json',
  jsonc: 'json',
  json5: 'json',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  console: 'bash',
  sql: 'sql',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  markdown: 'markdown',
  mdx: 'markdown',
  diff: 'diff',
  text: 'text',
  txt: 'text',
  plaintext: 'text',
}

let highlighterPromise: Promise<HighlighterCore> | null = null

function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [githubLight, githubDark],
      langs: [
        tsLang,
        tsxLang,
        jsLang,
        jsxLang,
        jsonLang,
        bashLang,
        sqlLang,
        yamlLang,
        mdLang,
        diffLang,
      ],
      engine: createJavaScriptRegexEngine({ forgiving: true }),
    })
  }
  return highlighterPromise
}

/** Collect the visible text of a hast node, skipping injected heading anchors. */
function textOf(node: Nodes): string {
  if (node.type === 'text') return node.value
  if (node.type === 'element') {
    const classes = node.properties?.className
    if (Array.isArray(classes) && classes.includes('heading-anchor')) return ''
    return node.children.map(textOf).join('')
  }
  if (node.type === 'root') return node.children.map(textOf).join('')
  return ''
}

/** Rewrite relative `.md` links to in-site routes, and other repo links to GitHub. */
function rehypeRewriteLinks(ctx: RenderContext) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'a') return
      const href = node.properties?.href
      if (typeof href !== 'string') return
      if (/^(https?:)?\/\//.test(href) || href.startsWith('#') || href.startsWith('mailto:')) {
        // External or in-page — leave as-is, but mark external links.
        if (/^https?:\/\//.test(href)) {
          node.properties.target = '_blank'
          node.properties.rel = 'noreferrer noopener'
        }
        return
      }

      const [rawPath, hash] = href.split('#')
      const cleanHash = hash ? `#${hash}` : ''
      const base = path.posix.basename(rawPath ?? '')

      if (base === 'GUIDE.md') {
        node.properties.href = `/docs${cleanHash}`
        return
      }
      const mapped = ctx.slugMap[base]
      if (mapped) {
        node.properties.href = `${mapped}${cleanHash}`
        return
      }

      // Anything else points at a repo file we don't render — send to GitHub.
      const dir = path.posix.dirname(ctx.sourcePath)
      const resolved = path.posix.normalize(path.posix.join(dir, rawPath ?? ''))
      node.properties.href = `${GITHUB_BLOB}/${resolved}${cleanHash}`
      node.properties.target = '_blank'
      node.properties.rel = 'noreferrer noopener'
    })
  }
}

/** Pull the h2/h3 headings (with ids) into `toc` for the "On this page" rail. */
function rehypeCollectToc(toc: TocEntry[]) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'h2' && node.tagName !== 'h3') return
      const id = node.properties?.id
      if (typeof id !== 'string') return
      toc.push({ depth: node.tagName === 'h2' ? 2 : 3, id, text: textOf(node).trim() })
    })
  }
}

/** Replace fenced code blocks with Shiki-highlighted, dual-theme markup. */
function rehypeShiki(highlighter: HighlighterCore) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'pre' || !parent || typeof index !== 'number') return
      const code = node.children.find(
        (c): c is Element => c.type === 'element' && c.tagName === 'code',
      )
      if (!code) return

      const classes = code.properties?.className
      const langClass = Array.isArray(classes)
        ? classes.map(String).find((c) => c.startsWith('language-'))
        : undefined
      const rawLang = langClass ? langClass.slice('language-'.length) : 'text'
      const lang = LANG_ALIASES[rawLang.toLowerCase()] ?? 'text'
      const value = textOf(code).replace(/\n$/, '')

      let result: Root
      try {
        result = highlighter.codeToHast(value, {
          lang,
          themes: { light: 'github-light', dark: 'github-dark-dimmed' },
          defaultColor: false,
        }) as Root
      } catch {
        return
      }

      const pre = result.children[0]
      if (pre && pre.type === 'element') {
        // Preserve the language so the client can render a label.
        pre.properties = { ...pre.properties, 'data-lang': rawLang }
        parent.children[index] = pre as ElementContent
        return [SKIP]
      }
      return
    })
  }
}

export interface RenderResult {
  html: string
  toc: TocEntry[]
}

/** Highlight a standalone code string to dual-theme HTML (for landing samples). */
export async function highlightCode(code: string, lang: string): Promise<string> {
  const highlighter = await getHighlighter()
  const target = LANG_ALIASES[lang.toLowerCase()] ?? 'text'
  return highlighter.codeToHtml(code, {
    lang: target,
    themes: { light: 'github-light', dark: 'github-dark-dimmed' },
    defaultColor: false,
  })
}

export async function renderMarkdown(raw: string, ctx: RenderContext): Promise<RenderResult> {
  const highlighter = await getHighlighter()
  const toc: TocEntry[] = []

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeCollectToc, toc)
    .use(rehypeAutolinkHeadings, {
      behavior: 'append',
      properties: { className: ['heading-anchor'], ariaHidden: 'true', tabIndex: -1 },
      content: { type: 'text', value: '#' },
    })
    .use(rehypeRewriteLinks, ctx)
    .use(rehypeShiki, highlighter)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(raw)

  return { html: String(file), toc }
}
