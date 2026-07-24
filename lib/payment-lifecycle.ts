export function isStalePaymentRevocation(
  currentCustomerId: string | null | undefined,
  eventSubscriptionId: string | null | undefined,
  eventTransactionId: string
): boolean {
  if (!currentCustomerId) return false
  const eventCustomerId = eventSubscriptionId || eventTransactionId
  return eventCustomerId !== currentCustomerId
}
