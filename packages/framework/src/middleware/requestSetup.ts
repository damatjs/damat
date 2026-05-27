import { Context, Next } from '@damatjs/deps/hono';
import { nanoid } from '@damatjs/deps/nanoid';

export async function requestSetup(c: Context, next: Next): Promise<Response | void> {
  c.set("requestId", nanoid(12));
  c.set("startTime", Date.now());
  await next();
  c.header("X-Request-ID", c.get("requestId"));
  c.header("X-Response-Time", `${Date.now() - c.get("startTime")}ms`);
}
