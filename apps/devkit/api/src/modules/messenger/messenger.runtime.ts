import type { MessengerEvent } from "./messenger.types.js";

type Listener = (event: MessengerEvent) => void;
const listeners = new Set<Listener>();

export function publishMessengerEvent(event: MessengerEvent) {
  for (const listener of listeners) listener(event);
}

export function subscribeMessengerEvents(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
