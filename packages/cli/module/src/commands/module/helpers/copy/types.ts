export interface InstalledModuleLayout {
  moduleHome: string;
  apiTarget: string | null;
  workflowsTarget: string | null;
  testsTarget: string | null;
  linksTarget: string | null;
}

export interface ModuleLayoutPaths {
  moduleHome: string;
  apiTarget: string;
  workflowsTarget: string;
  linksRoot: string;
  linksTarget: string;
  testsTarget: string;
}

export interface InstallModuleSplitOptions {
  cwd: string;
  moduleId: string;
  modulesDir: string;
  packageDir?: string;
  force?: boolean;
}

export interface RemovedModuleLayout {
  removed: string[];
  linksRegenerated: boolean;
}

export interface LinkModelFile {
  base: string;
  path: string;
}
