// Client-safe shared types (no Node/fs imports) so client components can use
// them without pulling the server-only content pipeline into the bundle.

export interface TocEntry {
  depth: 2 | 3
  id: string
  text: string
}

export interface NavChapter {
  slug: string
  title: string
  summary: string
}

export interface NavSection {
  id: string
  title: string
  chapters: NavChapter[]
}

export interface SearchDoc {
  slug: string
  title: string
  section: string
  summary: string
  headings: string[]
  text: string
}
