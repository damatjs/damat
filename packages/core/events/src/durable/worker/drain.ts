export async function waitForEventDeliveryDrain(
  active: Set<Promise<void>>,
  graceMs: number,
): Promise<boolean> {
  if (!active.size) return true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), graceMs);
  });
  const drained = Promise.allSettled(active).then(() => true as const);
  const result = await Promise.race([drained, timeout]);
  if (timer) clearTimeout(timer);
  return result;
}
