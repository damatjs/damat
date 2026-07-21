export function findFrameworkTests(root: string): string[] {
  return [...new Bun.Glob("src/**/*.test.ts").scanSync({ cwd: root })].sort();
}
