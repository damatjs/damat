import { RouteHandler } from "@damatjs/framework/router";

export const GET: RouteHandler = async (c) => {
  return c.json({
    success: true,
    data: {
      posts: [
        { id: "1", title: "First Post", content: "Hello World" },
        { id: "2", title: "Second Post", content: "Another post" },
      ],
    },
  });
};
