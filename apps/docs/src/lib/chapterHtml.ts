const LEADING_H1 = /^<h1(?:\s[^>]*)?>[\s\S]*?<\/h1>\s*/i;

/** The page template owns the chapter h1; remove the source Markdown duplicate. */
export function stripChapterTitle(html: string): string {
  return html.replace(LEADING_H1, "");
}
