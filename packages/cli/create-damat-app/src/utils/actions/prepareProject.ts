import fs from "fs";
import path from "path";
import type { Spinner } from "yocto-spinner";
import { EOL } from "os";
import { randomBytes } from "crypto";
import { displayFactBox, FactBoxOptions } from "../commands/facts";
import ProcessManager from "../commands/manager";
import PackageManager from "../package/manager";
import { PackageVersionsUpdate } from "../package/versionsUpdater";

let FRONTEND_CORS = "http://localhost:8000,http://localhost:5173,http://localhost:9000";
const DOCS_CORS = "https://docs.damat.com";
const AUTH_CORS = [FRONTEND_CORS, DOCS_CORS].join(",");
FRONTEND_CORS += `,${DOCS_CORS}`;
const DEFAULT_REDIS_URL = "redis://localhost:6379";

// 64 hex chars of CSPRNG entropy per secret — never a hardcoded default.
const generateSecret = () => randomBytes(32).toString("hex");

type PrepareModuleOptions = {
  isModule: true;
  directory: string;
  projectName: string;
  spinner: Spinner;
  processManager: ProcessManager;
  abortController?: AbortController;
  verbose?: boolean;
  packageManager: PackageManager;
};

type PrepareProjectOptions = {
  isModule: false;
  directory: string;
  projectName: string;
  spinner: Spinner;
  processManager: ProcessManager;
  abortController?: AbortController;
  verbose?: boolean;
  packageManager: PackageManager;
  version?: string;
};

type PrepareOptions = PrepareModuleOptions | PrepareProjectOptions;

export default async <
  T extends PrepareOptions,
  Output = T extends { isModule: true } ? void : string | undefined,
>(
  prepareOptions: T,
): Promise<Output> => {
  if (prepareOptions.isModule) {
    return prepareModule(prepareOptions) as Output;
  }

  return prepareProject(prepareOptions) as Output;
};

async function prepareModule({
  directory,
  projectName,
  spinner,
  processManager,
  abortController,
  verbose = false,
  packageManager,
}: PrepareModuleOptions) {
  // initialize execution options
  const execOptions = {
    cwd: directory,
    signal: abortController?.signal,
  };

  const factBoxOptions: FactBoxOptions = {
    interval: null,
    spinner,
    processManager,
    message: "",
    title: "",
    verbose,
  };

  // Update package.json
  const packageJsonPath = path.join(directory, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

  // Update name
  packageJson.name = projectName;

  // Add packageManager field to ensure consistent version usage
  const packageManagerString = await packageManager.getPackageManagerString();
  if (packageManagerString) {
    packageJson.packageManager = packageManagerString;
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  factBoxOptions.interval = displayFactBox({
    ...factBoxOptions,
    spinner,
    title: "Installing dependencies...",
    processManager,
  });

  await packageManager.installDependencies(execOptions);

  factBoxOptions.interval = displayFactBox({
    ...factBoxOptions,
    message: "Installed Dependencies",
  });

  displayFactBox({ ...factBoxOptions, message: "Finished Preparation" });
}

async function prepareProject({
  directory,
  projectName,
  spinner,
  processManager,
  abortController,
  verbose = false,
  packageManager,
  version,
}: PrepareProjectOptions) {
  // initialize execution options
  const execOptions = {
    cwd: directory,
    signal: abortController?.signal,
  };

  const factBoxOptions: FactBoxOptions = {
    interval: null,
    spinner,
    processManager,
    message: "",
    title: "",
    verbose,
  };

  // Update package.json
  const packageJsonPath = path.join(directory, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

  // Update name
  packageJson.name = projectName;

  // Add packageManager field to ensure consistent version usage
  const packageManagerString = await packageManager.getPackageManagerString();
  if (packageManagerString) {
    packageJson.packageManager = packageManagerString;
  }

  // Update damat dependencies versions
  if (version) {
    PackageVersionsUpdate(packageJson, version);
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // add environment variables
  // Removed MEDUSA_ADMIN_ONBOARDING_TYPE
  // Secrets are generated per project instead of a shared hardcoded value.
  // DATABASE_URL points at a local Postgres placeholder so the app fails with
  // a clear connection error (not a missing-var crash) until it is updated.
  const databaseName = projectName.replace(/-/g, "_");
  const env = [
    `FRONTEND_CORS=${FRONTEND_CORS}`,
    `AUTH_CORS=${AUTH_CORS}`,
    `REDIS_URL=${DEFAULT_REDIS_URL}`,
    `JWT_SECRET=${generateSecret()}`,
    `COOKIE_SECRET=${generateSecret()}`,
    `# Update DATABASE_URL to point at your Postgres instance (create the database first).`,
    `DATABASE_URL=postgres://postgres:postgres@localhost:5432/${databaseName}`,
  ].join(EOL);

  fs.appendFileSync(path.join(directory, `.env`), env);

  factBoxOptions.interval = displayFactBox({
    ...factBoxOptions,
    spinner,
    title: "Installing dependencies...",
    processManager,
  });

  await packageManager.installDependencies(execOptions);

  factBoxOptions.interval = displayFactBox({
    ...factBoxOptions,
    message: "Installed Dependencies",
  });


  displayFactBox({ ...factBoxOptions, message: "Finished Preparation" });
}
