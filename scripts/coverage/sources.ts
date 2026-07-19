import { dirname, isAbsolute, relative, resolve } from "node:path";
import { hasRuntimeSource } from "./runtime-source";

type TestConfig = {
  coverage?: boolean;
  coveragePathIgnorePatterns?: string[];
};

export type CoveragePackage = {
  dir: string;
  ignores: Bun.Glob[];
};

const sourceGlob = new Bun.Glob(
  "{src,bin}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}",
);

export async function coveragePackages(root: string): Promise<CoveragePackage[]> {
  const glob = new Bun.Glob("{packages,backend}/**/bunfig.toml");
  const packages: CoveragePackage[] = [];
  for await (const configPath of glob.scan({ cwd: root, absolute: true })) {
    const config = Bun.TOML.parse(await Bun.file(configPath).text()) as {
      test?: TestConfig;
    };
    if (!config.test?.coverage) continue;
    packages.push({
      dir: dirname(configPath),
      ignores: (config.test.coveragePathIgnorePatterns ?? []).map(
        (pattern) => new Bun.Glob(pattern),
      ),
    });
  }
  return packages.sort((left, right) => left.dir.localeCompare(right.dir));
}

function ignored(pkg: CoveragePackage, file: string): boolean {
  const local = relative(pkg.dir, file);
  return pkg.ignores.some((glob) => glob.match(local) || glob.match(file));
}

export async function expectedSources(pkg: CoveragePackage): Promise<string[]> {
  const expected: string[] = [];
  for await (const local of sourceGlob.scan({ cwd: pkg.dir })) {
    if (local.endsWith(".d.ts")) continue;
    const file = resolve(pkg.dir, local);
    if (ignored(pkg, file)) continue;
    if (hasRuntimeSource(await Bun.file(file).text(), file)) expected.push(file);
  }
  return expected.sort();
}

export async function loadedSources(pkg: CoveragePackage): Promise<Set<string>> {
  const report = Bun.file(resolve(pkg.dir, "coverage/lcov.info"));
  if (!(await report.exists())) return new Set();
  const files = (await report.text())
    .split(/\r?\n/)
    .filter((line) => line.startsWith("SF:"))
    .map((line) => line.slice(3))
    .map((file) => (isAbsolute(file) ? resolve(file) : resolve(pkg.dir, file)));
  return new Set(files);
}
