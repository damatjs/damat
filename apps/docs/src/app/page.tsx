import { redirect } from 'next/navigation'

/** This app is docs-only — the marketing home lives in apps/web. */
export default function RootPage() {
  redirect('/docs')
}
