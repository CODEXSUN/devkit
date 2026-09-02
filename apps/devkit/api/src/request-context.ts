import { AsyncLocalStorage } from "node:async_hooks";

export type DevkitActor = {
  canMessageActor?: (actorId: string) => Promise<boolean>;
  email?: string;
  id: string;
  messageableActors?: () => Promise<Array<{ email: string; name: string; uuid: string }>>;
  permissions: readonly string[];
  roles: readonly string[];
};

const actorContext = new AsyncLocalStorage<DevkitActor>();

export function runWithDevkitActor<T>(actor: DevkitActor, callback: () => T) {
  return actorContext.run(actor, callback);
}

export function requireDevkitActor() {
  const actor = actorContext.getStore();
  if (!actor) throw new Error("DevKit requires a CXApp-provided actor.");
  return actor;
}
