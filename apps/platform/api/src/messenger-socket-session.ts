export function messengerSocketExpiryDelay(expiresAt: number, now = Date.now()) {
  return Math.max(1, expiresAt - now);
}
