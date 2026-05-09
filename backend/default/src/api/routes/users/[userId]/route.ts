import { defineRoute } from "../../../../../../../packages/server-handler/dist/router";

export const GET = defineRoute<{ userId: string }>(async (c, params) => {
  return c.json({
    success: true,
    data: {
      id: params.userId,
      name: "John Doe",
      email: "john@example.com",
      createdAt: new Date().toISOString(),
    },
  });
});

export const PUT = defineRoute<{ userId: string }>(async (c, params) => {
  const body = await c.req.json();

  return c.json({
    success: true,
    data: {
      id: params.userId,
      ...body,
      updatedAt: new Date().toISOString(),
    },
  });
});

export const DELETE = defineRoute<{ userId: string }>(async (c, params) => {
  return c.json({
    success: true,
    data: {
      id: params.userId,
      deleted: true,
    },
  });
});
