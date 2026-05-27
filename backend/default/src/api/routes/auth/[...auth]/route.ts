import type { RouteHandler } from "@damatjs/framework/router";
import { getAuth } from "../../../../utils/auth";

export const POST: RouteHandler = async (c) => {
  const auth = getAuth();
  return auth.handler(c.req.raw);
};

export const GET: RouteHandler = async (c) => {
  const auth = getAuth();
  return auth.handler(c.req.raw);
};
