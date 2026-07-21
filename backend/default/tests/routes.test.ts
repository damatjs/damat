import { describe, it, expect } from "bun:test";

import { GET as PostsGET } from "@/api/routes/posts/route";
import { GET as UsersGET, POST as UsersPOST } from "@/api/routes/users/route";
import {
  GET as UserGET,
  PUT as UserPUT,
  DELETE as UserDELETE,
} from "@/api/routes/users/[userId]/route";

type CtxOpts = {
  json?: unknown;
  query?: Record<string, string>;
  param?: Record<string, string>;
};

type JsonResult = { _data: any; _status: number };

function makeCtx(opts: CtxOpts = {}) {
  const c = {
    req: {
      json: async () => opts.json,
      query: (k: string) => opts.query?.[k],
      param: () => opts.param ?? {},
      raw: { headers: new Headers() },
    },
    json: (data: any, status = 200): JsonResult => ({
      _data: data,
      _status: status,
    }),
  };
  return c as any;
}

describe("routes › GET /posts", () => {
  it("returns the static list of posts", async () => {
    const r: JsonResult = await PostsGET(makeCtx());
    expect(r._status).toBe(200);
    expect(r._data.success).toBe(true);
    expect(r._data.data.posts).toHaveLength(2);
    expect(r._data.data.posts[0]).toMatchObject({
      id: "1",
      title: "First Post",
    });
  });
});

describe("routes › /users collection", () => {
  it("GET returns the static user list", async () => {
    const r: JsonResult = await UsersGET(makeCtx());
    expect(r._status).toBe(200);
    expect(r._data.success).toBe(true);
    expect(r._data.data.users).toHaveLength(2);
    expect(r._data.data.users[1]).toMatchObject({ id: "2", name: "Jane Doe" });
  });

  it("POST echoes the body, assigns an id and returns 201", async () => {
    const r: JsonResult = await UsersPOST(
      makeCtx({ json: { name: "New", email: "n@x.co" } }),
    );
    expect(r._status).toBe(201);
    expect(r._data.success).toBe(true);
    expect(r._data.data.id).toBe("3");
    expect(r._data.data.name).toBe("New");
    expect(typeof r._data.data.createdAt).toBe("string");
  });
});

describe("routes › /users/:userId item", () => {
  it("GET reflects the userId param", async () => {
    const r: JsonResult = await UserGET(
      makeCtx({ param: { userId: "usr_7" } }),
    );
    expect(r._status).toBe(200);
    expect(r._data.data.id).toBe("usr_7");
    expect(r._data.data.email).toBe("john@example.com");
    expect(typeof r._data.data.createdAt).toBe("string");
  });

  it("PUT merges the body onto the id and stamps updatedAt", async () => {
    const r: JsonResult = await UserPUT(
      makeCtx({ param: { userId: "usr_7" }, json: { name: "Renamed" } }),
    );
    expect(r._data.data.id).toBe("usr_7");
    expect(r._data.data.name).toBe("Renamed");
    expect(typeof r._data.data.updatedAt).toBe("string");
  });

  it("DELETE returns a deleted:true marker for the id", async () => {
    const r: JsonResult = await UserDELETE(
      makeCtx({ param: { userId: "usr_7" } }),
    );
    expect(r._data.data).toEqual({ id: "usr_7", deleted: true });
  });
});
