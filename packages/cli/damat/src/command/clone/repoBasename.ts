/** The default target directory name for a repo URL ("…/service.git" → "service"). */
export function repoBasename(repoUrl: string): string {
  const last = repoUrl.replace(/\/+$/, "").split(/[/:]/).pop() ?? "repo";
  return last.replace(/\.git$/, "") || "repo";
}