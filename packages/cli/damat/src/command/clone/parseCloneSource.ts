interface ParsedCloneSource {
  repoUrl: string;
  subDir: string;
  ref: string;
}

/**
 * URL (`https://…`, `git@…`) or github shorthand (`user/repo[/sub/dir]`),
 * either with an optional `#ref` suffix. Shorthand with extra segments means
 * "extract this subdirectory".
 */
export function parseCloneSource(source: string): ParsedCloneSource {
  let ref = "";
  let clean = source;
  const hashIndex = source.indexOf("#");
  if (hashIndex !== -1) {
    ref = source.slice(hashIndex + 1);
    clean = source.slice(0, hashIndex);
  }

  if (/^(https?:\/\/|git@)/.test(clean)) {
    return { repoUrl: clean, subDir: "", ref };
  }
  if (/^[\w.-]+\/[\w.-]+(\/.*)?$/.test(clean)) {
    const [user, repo, ...rest] = clean.split("/");
    return {
      repoUrl: `https://github.com/${user}/${repo}.git`,
      subDir: rest.join("/"),
      ref,
    };
  }
  throw new Error(
    `"${source}" is neither a git URL nor a github shorthand (user/repo[/sub/dir][#ref])`,
  );
}
