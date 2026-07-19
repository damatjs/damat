const status = Bun.spawnSync([
  "git",
  "status",
  "--porcelain=v1",
  "--untracked-files=all",
]);
if (status.exitCode !== 0) throw new Error(status.stderr.toString());
const changes = status.stdout.toString().trim();
if (changes) {
  console.error("Release checkout is not clean:\n" + changes);
  process.exit(1);
}
console.log("Release checkout is clean and reproducible.");
