import type { WorkActor } from "./types";

const actorTypes = new Set(["user", "service", "system"]);

export function validateWorkActor(actor: WorkActor | undefined): WorkActor {
  if (!actor) throw new Error("actor is required");
  if (!actor.id?.trim()) throw new Error("actor id must not be blank");
  if (!actorTypes.has(actor.type)) throw new Error("actor type is invalid");
  return actor;
}
