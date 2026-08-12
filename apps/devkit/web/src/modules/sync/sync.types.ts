export type SyncRole = "cloud" | "disabled" | "local";

export type SyncStatus = {
  bound: boolean;
  cloudUrl: "https://devkit.codexsun.com";
  conflictCount: number;
  instanceId: string;
  lastError: string | null;
  lastPulledAt: string | null;
  lastPublishedAt: string | null;
  pendingRecords: number;
  remoteRevision: number;
  role: SyncRole;
  status: "bound" | "conflict" | "disabled" | "unbound";
};

export type GeneratedSyncToken = {
  createdAt: string;
  label: string;
  token: string;
};

export type SyncResult = {
  direction: "pull" | "push";
  records: number;
  revision: number;
  synchronizedAt: string;
};

export type ProjectSyncVerification = {
  cloudUrl: string;
  instanceId: string;
  localAccepted: true;
  pendingProjects: number;
  projectCount: number;
  remoteAccepted: boolean;
  remoteLabel: string;
  remoteRevision: number;
  scope?: "projects";
  verifiedAt: string;
};
