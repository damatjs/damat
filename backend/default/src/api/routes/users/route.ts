import { RouteHandler } from "@damatjs/framework/router";

export const GET: RouteHandler = async (c) => {
  return c.json({
    success: true,
    data: {
      users: [
        { id: "1", name: "John Doe", email: "john@example.com" },
        { id: "2", name: "Jane Doe", email: "jane@example.com" },
      ],
    },
  });
};

export const POST: RouteHandler = async (c) => {
  const body = await c.req.json();

  return c.json(
    {
      success: true,
      data: {
        id: "3",
        ...body,
        createdAt: new Date().toISOString(),
      },
    },
    201,
  );
};
