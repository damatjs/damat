const build = [
  "bunx",
  "turbo",
  "run",
  "build",
  "--filter=@damatjs/docs",
  "--filter=@damatjs/registry",
  "--filter=@damatjs/web",
  "--concurrency=1",
];
const siteEnv = {
  ...process.env,
  DOCS_ORIGIN: "http://127.0.0.1:3030",
  NEXT_PUBLIC_DOCS_URL: "",
  NEXT_PUBLIC_DOMAIN_URL: "http://127.0.0.1:3020",
  NEXT_PUBLIC_GOOGLE_ANALYTICS: "",
  NEXT_PUBLIC_REGISTRY_URL: "https://registry.damatjs.com",
};

async function run(command: string[]): Promise<void> {
  const child = Bun.spawn(command, {
    env: siteEnv,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) process.exit(exitCode);
}

await run(build);
await run(["bunx", "playwright", "test"]);
