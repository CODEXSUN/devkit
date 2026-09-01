import type { MessengerEvent, MessengerUnreadEvent } from "./messenger.types.js";

type Listener = (event: MessengerEvent) => void;
const listeners = new Set<Listener>();
type UnreadListener = (event: MessengerUnreadEvent) => void;
const unreadListeners = new Set<UnreadListener>();

export function publishMessengerEvent(event: MessengerEvent) {
  for (const listener of listeners) listener(event);
}

export function subscribeMessengerEvents(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publishMessengerUnreadEvent(event: MessengerUnreadEvent) {
  for (const listener of unreadListeners) listener(event);
}

export function subscribeMessengerUnreadEvents(listener: UnreadListener) {
  unreadListeners.add(listener);
  return () => unreadListeners.delete(listener);
}
