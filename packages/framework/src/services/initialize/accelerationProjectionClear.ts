import type { Redis } from "@damatjs/redis";

export async function clearReadyProjection(redis: Redis): Promise<void> {
  let cursor = "0";
  const readyKeys: string[] = [];
  do {
    const [next, keys] = await redis.scan(
      cursor,
      "MATCH",
      "damat:ready:*",
      "COUNT",
      100,
    );
    cursor = next;
    readyKeys.push(...keys);
  } while (cursor !== "0");
  for (let index = 0; index < readyKeys.length; index += 100) {
    await redis.del(...readyKeys.slice(index, index + 100));
  }
}
