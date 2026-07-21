import { defineDurableEventHandler } from "@damatjs/framework";
import { USER_CREATED_EVENT } from "../userCreated";

export const AUDIT_USER_CONSUMER = "auditUser";

export const auditUserConsumer = defineDurableEventHandler(
  USER_CREATED_EVENT,
  AUDIT_USER_CONSUMER,
  async (payload, context) => {
    await context.progress({ percent: 100, phase: "audited" });
    await context.log("info", "User creation audited", {
      userId: payload.userId,
    });
    return { audited: true, userId: payload.userId };
  },
);
