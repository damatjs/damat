export class DurableEventNotFoundError extends Error {
  override readonly name = "DurableEventNotFoundError";

  constructor(id: string) {
    super(`Durable event delivery "${id}" was not found`);
  }
}

export class DurableEventTransitionError extends Error {
  override readonly name = "DurableEventTransitionError";

  constructor(message: string) {
    super(message);
  }
}
