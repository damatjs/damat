export class EventDeliveryLeaseLostError extends Error {
  constructor(deliveryId: string) {
    super(`Lease lost for durable event delivery ${deliveryId}`);
    this.name = "EventDeliveryLeaseLostError";
  }
}
