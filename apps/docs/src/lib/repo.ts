import fs from 'node:fs'
import path from 'node:path'

/**
 * Walk up from the docs app until we find the monorepo root (the folder that
 * holds `docs/guide.json`). This keeps the docs site sourcing its content from
 * the single canonical `docs/` folder instead of a duplicated copy.
 */
function findRepoRoot(start: string): string {
  let dir = start
  for (;;) {
    if (fs.existsSync(path.join(dir, 'docs', 'guide.json'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) {
      throw new Error('Could not locate repo root (docs/guide.json not found)')
    }
    dir = parent
  }
}

export const REPO_ROOT = findRepoRoot(process.cwd())
export const DOCS_DIR = path.join(REPO_ROOT, 'docs')

/** GitHub coordinates — used to link out to source files not rendered here. */
export const GITHUB_REPO = 'damatjs/damat'
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`
export const GITHUB_BLOB = `${GITHUB_URL}/blob/main`
