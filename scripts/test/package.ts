const databaseVariable = process.argv[2];
if (!databaseVariable) throw new Error("A database variable name is required");

const selectedUrl = process.env[databaseVariable] ?? process.env.DATABASE_URL;
const env = { ...process.env };
if (selectedUrl) env.DATABASE_URL = selectedUrl;
else delete env.DATABASE_URL;

const child = Bun.spawn(["bun", "test", ...process.argv.slice(3)], {
  env,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});
process.exit(await child.exited);
