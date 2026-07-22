export async function waitForReadiness(
  output: () => string,
  count: number,
): Promise<number> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const matches = [
      ...output().matchAll(/ready at http:\/\/localhost:(\d+)/g),
    ];
    if (matches.length >= count) return Number(matches.at(-1)![1]);
    await Bun.sleep(25);
  }
  throw new Error("Module readiness timed out");
}
