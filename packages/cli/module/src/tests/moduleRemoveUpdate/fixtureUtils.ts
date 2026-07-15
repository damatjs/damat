export async function withVerifyPolicy<T>(
  value: string | undefined,
  action: () => Promise<T>,
): Promise<T> {
  const previous = process.env.DAMAT_MODULE_VERIFY;
  if (value === undefined) delete process.env.DAMAT_MODULE_VERIFY;
  else process.env.DAMAT_MODULE_VERIFY = value;
  try {
    return await action();
  } finally {
    if (previous === undefined) delete process.env.DAMAT_MODULE_VERIFY;
    else process.env.DAMAT_MODULE_VERIFY = previous;
  }
}

export const configWithUser = `export default defineConfig({
  modules: {
    user: { resolve: "./src/modules/user", id: "user", source: { type: "path", ref: "/pkg", installedAt: "2026-01-01T00:00:00.000Z" } },
    billing: { resolve: "./src/modules/billing", id: "billing" },
  },
});
`;

export const dirent = (name: string, isDir = true) => ({
  name,
  isDirectory: () => isDir,
});
