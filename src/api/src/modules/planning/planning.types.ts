export type PlanningScene = {
  appState?: Record<string, unknown> | undefined;
  elements: unknown[];
  files?: Record<string, unknown> | undefined;
};

export type PlanningBoard = {
  createdAt: string;
  createdBy: string;
  description: string;
  projectUuid: string | null;
  scene: PlanningScene;
  status: string;
  title: string;
  updatedAt: string;
  updatedBy: string;
  uuid: string;
};
