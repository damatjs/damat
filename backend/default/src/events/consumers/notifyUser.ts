import { defineDurableEventHandler } from "@damatjs/framework";
import { USER_CREATED_EVENT } from "../userCreated";

export const NOTIFY_USER_CONSUMER = "notifyUser";

export const notifyUserConsumer = defineDurableEventHandler(
  USER_CREATED_EVENT,
  NOTIFY_USER_CONSUMER,
  async (payload, context) => {
    await context.progress({ percent: 100, phase: "notified" });
    await context.log("info", "User notification sent", {
      userId: payload.userId,
      email: payload.email,
    });
    return { notified: true, userId: payload.userId };
  },
);
