export type OrchestrationPermissionLevel =
  | "read-only"
  | "development"
  | "project"
  | "deployment"
  | "infrastructure"
  | "production"
  | "admin";

export type OrchestrationCatalog = {
  agentProfiles: Array<{
    capabilities: string[];
    defaultMode: string;
    description: string;
    id: string;
    name: string;
    permissionLevel: OrchestrationPermissionLevel;
    requiresApprovalFor: string[];
    status: "definition-ready";
  }>;
  architecture: "modular-monolith";
  assistModes: Array<{
    id: string;
    label: string;
    permissionLevel: OrchestrationPermissionLevel;
    purpose: string;
  }>;
  controlBoundaries: Array<{
    description: string;
    id: string;
    title: string;
  }>;
  externalLabel: "CodeLogicX";
  lifecycle: Array<{
    approvalRequired: boolean;
    href: string;
    id: string;
    label: string;
    objective: string;
    state: "connected" | "foundation" | "planned";
  }>;
  technicalName: "devkit";
};
