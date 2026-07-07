// Validation for CLI-provided values. Commands are spawned with argv arrays
// (no shell), so these checks are defense in depth: they keep hostile or
// malformed values out of git/bunx arguments (e.g. option injection via a
// leading "-") and fail early with a clear message instead of a confusing
// downstream error.

// Safe project/module name: letters, digits, `-` and `_`, starting with a
// letter or digit. Dots are rejected separately (with the message the tool
// already advertises) because they break MikroORM path resolution.
export const PROJECT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

// Accepted repo locations: http(s)/git/ssh URLs, scp-like git@host:path, or
// an owner/repo shorthand. None of them can start with "-", so a value can
// never be smuggled in as a git flag (e.g. --upload-pack).
const REPO_URL_PATTERNS = [
  /^(?:https?|git|ssh):\/\/(?:[\w.-]+@)?[\w.-]+(?::\d+)?(?:\/[\w.\-/~%]*)?$/,
  /^[\w.-]+@[\w.-]+:[\w.\-/~]+$/,
  /^[\w.-]+\/[\w.-]+$/,
];

// Semver versions, npm dist-tags, and simple ranges: latest, 1.2.3,
// v1.2.3-beta.1, ^1.0.0, ~2.0.0, ...
const VERSION_PATTERN = /^[~^]?[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Returns an error message when the name is not a safe slug, or `undefined`
 * when the name is valid.
 */
export function validateProjectName(
  name: string,
  isModule?: boolean,
): string | undefined {
  const kind = isModule ? "module" : "project";

  if (!name.length) {
    return `Please enter a ${kind} name`;
  }

  // We don't allow projects to have a dot in the name, as this causes issues
  // for MikroORM path resolutions.
  if (name.includes(".")) {
    return `Project names cannot contain a dot (.) character. Please enter a different ${kind} name.`;
  }

  if (!PROJECT_NAME_PATTERN.test(name)) {
    return `Project names may only contain letters, numbers, hyphens (-), and underscores (_), and must start with a letter or number. Please enter a different ${kind} name.`;
  }

  return undefined;
}

export function isValidRepoUrl(repoUrl: string): boolean {
  return REPO_URL_PATTERNS.some((pattern) => pattern.test(repoUrl));
}

export function isValidVersion(version: string): boolean {
  return VERSION_PATTERN.test(version);
}
