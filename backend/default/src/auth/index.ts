import { getAuth } from "../utils/auth";

export function setupAuth(app: any) {
  const auth = getAuth();
  app.on(["POST", "GET"], "/api/auth/*", (c: any) => auth.handler(c.req.raw));
}
