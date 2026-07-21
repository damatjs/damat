export function encodeEventConsumerScope(
  event: string,
  consumer: string,
): string {
  return JSON.stringify([event, consumer]);
}
