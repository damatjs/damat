import { Redis } from "@damatjs/deps/ioredis";

const url = process.env.REDIS_URL;
if (!url) throw new Error("REDIS_URL is required for Redis acceptance");
const publisher = new Redis(url, {
  lazyConnect: true,
  enableReadyCheck: false,
  maxRetriesPerRequest: 1,
});
const subscriber = new Redis(url, {
  lazyConnect: true,
  enableReadyCheck: false,
  maxRetriesPerRequest: 1,
});
const channel = "damat:operations:acceptance";
const key = `damat:operations:${crypto.randomUUID()}`;

try {
  await Promise.all([publisher.connect(), subscriber.connect()]);
  const received = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Redis pub/sub timed out")),
      5_000,
    );
    subscriber.once("message", (_channel, message) => {
      clearTimeout(timer);
      resolve(message);
    });
  });
  await subscriber.subscribe(channel);
  await publisher.set(key, "accepted", "EX", 30);
  if ((await publisher.get(key)) !== "accepted")
    throw new Error("Redis read/write failed");
  await publisher.publish(channel, "accepted");
  if ((await received) !== "accepted")
    throw new Error("Redis channel access failed");
  let configDenied = false;
  try {
    await publisher.config("GET", "maxmemory");
  } catch (error) {
    configDenied = String(error).includes("NOPERM");
  }
  if (!configDenied) throw new Error("Redis runtime user can execute CONFIG");
  console.log("Redis auth, key access, channel ACL, and admin denial passed.");
} finally {
  await publisher.del(key).catch(() => undefined);
  await Promise.all([publisher.quit(), subscriber.quit()]);
}
