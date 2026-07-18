import type { AccelerationActor } from "./types";

export interface AccelerationController {
  rebuild(actor: AccelerationActor): Promise<void>;
}

const KEY = Symbol.for("damatjs.durability.accelerationController");
type Storage = typeof globalThis & { [KEY]?: AccelerationController };
const storage = globalThis as Storage;

export function configureAccelerationController(
  controller: AccelerationController,
): void {
  storage[KEY] = controller;
}

export function clearAccelerationController(): void {
  delete storage[KEY];
}

export function rebuildAccelerationProjection(
  actor: AccelerationActor,
): Promise<void> {
  if (!actor.id.trim() || !actor.reason.trim()) {
    throw new Error("Acceleration rebuild requires an actor and reason");
  }
  const controller = storage[KEY];
  if (!controller) throw new Error("Acceleration controller is not configured");
  return controller.rebuild(actor);
}
