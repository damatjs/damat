interface ParsedSemver {
  core: [number, number, number];
  prerelease: string[] | null;
}

const SEMVER =
  /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

export function isSemver(value: string): boolean {
  return SEMVER.test(value);
}

function parseSemver(value: string): ParsedSemver {
  const match = SEMVER.exec(value);
  if (!match) throw new Error(`Invalid release version: ${value}`);
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4]?.split(".") ?? null,
  };
}

function compareIdentifier(left: string, right: string): number {
  const leftNumber = /^\d+$/.test(left) ? Number(left) : null;
  const rightNumber = /^\d+$/.test(right) ? Number(right) : null;
  if (leftNumber !== null && rightNumber !== null)
    return leftNumber - rightNumber;
  if (leftNumber !== null) return -1;
  if (rightNumber !== null) return 1;
  return left.localeCompare(right);
}

export function compareSemver(left: string, right: string): number {
  const a = parseSemver(left);
  const b = parseSemver(right);
  for (let index = 0; index < a.core.length; index++) {
    const difference = a.core[index] - b.core[index];
    if (difference !== 0) return difference;
  }
  if (!a.prerelease && !b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  for (
    let index = 0;
    index < Math.max(a.prerelease.length, b.prerelease.length);
    index++
  ) {
    if (a.prerelease[index] === undefined) return -1;
    if (b.prerelease[index] === undefined) return 1;
    const difference = compareIdentifier(
      a.prerelease[index],
      b.prerelease[index],
    );
    if (difference !== 0) return difference;
  }
  return 0;
}

export function compareSemverDesc(left: string, right: string): number {
  return compareSemver(right, left);
}
