import { defineDurableEvent } from "@damatjs/framework";

export const USER_CREATED_EVENT = "user.created";

export interface UserCreatedPayload {
  userId: string;
  email: string;
}

declare module "@damatjs/events" {
  interface DurableEventMap {
    "user.created": UserCreatedPayload;
  }
}

export const userCreatedEvent = defineDurableEvent(USER_CREATED_EVENT, {
  version: 1,
  maxAttempts: 5,
  backoffMs: 1_000,
});
