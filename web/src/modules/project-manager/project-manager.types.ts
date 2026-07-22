export type ProjectManagerKind =
  | "activity"
  | "discussion"
  | "issue"
  | "kanban"
  | "release"
  | "review"
  | "task"
  | "timeline"
  | "todo";

export type ProjectManagerRecord = {
  active: boolean;
  assignee: string;
  createdAt: string;
  description: string;
  dueDate: string;
  id: string;
  key: string;
  kind: ProjectManagerKind;
  lane: string;
  moduleKey: string;
  priority: "critical" | "high" | "low" | "medium";
  referenceId: string;
  referenceType: string;
  sortOrder: number;
  status: string;
  title: string;
  type: string;
  updatedAt: string;
};

export type ProjectManagerResult = {
  generatedAt: string;
  records: Record<ProjectManagerKind, ProjectManagerRecord[]>;
  summary: {
    active: number;
    blocked: number;
    completed: number;
    total: number;
  };
};

export type ProjectManagerForm = {
  assignee: string;
  description: string;
  dueDate: string;
  id?: string;
  key: string;
  lane: string;
  moduleKey: string;
  priority: ProjectManagerRecord["priority"];
  referenceId: string;
  referenceType: string;
  sortOrder: string;
  status: string;
  title: string;
  type: string;
};

export type ProjectManagerRegistryPlatform = {
  active: boolean;
  createdAt: string;
  description: string;
  id: string;
  key: string;
  name: string;
  sortOrder: number;
  status: string;
  updatedAt: string;
};

export type ProjectManagerRegistryGroup = {
  active: boolean;
  createdAt: string;
  description: string;
  id: string;
  key: string;
  name: string;
  parentGroupId: string;
  platformId: string;
  sortOrder: number;
  status: string;
  updatedAt: string;
};

export type ProjectManagerRegistryModule = {
  active: boolean;
  createdAt: string;
  description: string;
  documentation: Record<string, ProjectManagerDocumentationRow[]>;
  groupId: string;
  id: string;
  key: string;
  moduleType: "area" | "module" | "page";
  name: string;
  parentModuleId: string;
  planningNotes: ProjectManagerPlanningNote[];
  routePath: string;
  sortOrder: number;
  status: string;
  updatedAt: string;
};

export type ProjectManagerDocumentationRow = {
  createdAt: string;
  id: string;
  key: string;
  updatedAt: string;
  value: string;
};
export type ProjectManagerPlanningNote = {
  body: string;
  createdAt: string;
  id: string;
  title: string;
  updatedAt: string;
};

export type ProjectManagerRegistryModuleNode = ProjectManagerRegistryModule & {
  children: ProjectManagerRegistryModuleNode[];
};

export type ProjectManagerRegistryGroupNode = ProjectManagerRegistryGroup & {
  modules: ProjectManagerRegistryModuleNode[];
  subGroups: ProjectManagerRegistryGroupNode[];
};

export type ProjectManagerRegistryPlatformNode = ProjectManagerRegistryPlatform & {
  groups: ProjectManagerRegistryGroupNode[];
};

export type ProjectManagerRegistryResult = {
  generatedAt: string;
  platforms: ProjectManagerRegistryPlatformNode[];
  summary: {
    activeGroups: number;
    activeModules: number;
    platforms: number;
    totalGroups: number;
    totalModules: number;
  };
};
