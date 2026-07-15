export interface PackageInstallResult {
  ok: boolean;
  output: string;
}

export interface PackageInstallOptions {
  allowScripts?: boolean;
}

export interface PackageValidationOptions {
  allowUnsafeRanges?: boolean;
}
