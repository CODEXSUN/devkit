export const projectManagerEvents = {
  changed: "devkit.project-manager.changed",
  registryChanged: "devkit.project-manager.registry-changed"
} as const;

export function createProjectManagerEvent(
  action: "created" | "updated" | "status-changed",
  payload: { id: string; kind: string }
) {
  return {
    name: projectManagerEvents.changed,
    occurredAt: new Date().toISOString(),
    payload: { action, ...payload },
    version: 1
  };
}
