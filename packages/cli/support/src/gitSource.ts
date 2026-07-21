export interface ParsedGitSource {
  repoUrl: string;
  subDir: string;
  ref: string;
}

/** Parse a Git URL or GitHub shorthand with optional subdirectory and ref. */
export function parseGitSource(source: string): ParsedGitSource {
  const hashIndex = source.indexOf("#");
  const ref = hashIndex === -1 ? "" : source.slice(hashIndex + 1);
  const clean = hashIndex === -1 ? source : source.slice(0, hashIndex);

  if (/^(https?:\/\/|git@)/.test(clean)) {
    return { repoUrl: clean, subDir: "", ref };
  }
  if (/^[\w.-]+\/[\w.-]+(\/.*)?$/.test(clean)) {
    const [owner, repository, ...path] = clean.split("/");
    return {
      repoUrl: `https://github.com/${owner}/${repository}.git`,
      subDir: path.join("/"),
      ref,
    };
  }
  throw new Error(
    `"${source}" is neither a git URL nor a github shorthand (user/repo[/sub/dir][#ref])`,
  );
}
