import type { PlanningScene } from "./planning.types";

export function planningSceneFromSerialized(serialized: string): PlanningScene {
  const value = JSON.parse(serialized) as {
    appState?: Record<string, unknown>;
    elements?: unknown[];
    files?: Record<string, unknown>;
  };
  return {
    appState: value.appState ?? {},
    elements: value.elements ?? [],
    files: value.files ?? {},
  };
}
