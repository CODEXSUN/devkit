export const DEVKIT_SYNC_CLOUD_URL = "https://devkit.codexsun.com";

export type DevkitSyncRole = "cloud" | "disabled" | "local";
export type DevkitSyncDirection = "inbound" | "local" | "outbound";
export type DevkitSyncState = "conflict" | "deleted" | "pending" | "synchronized";

export type DevkitSyncSnapshot = {
  attachmentData: Record<string, string>;
  instanceId: string;
  protocolVersion: 1;
  publishedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
};

export type DevkitSyncStatus = {
  bound: boolean;
  cloudUrl: string;
  conflictCount: number;
  instanceId: string;
  lastError: string | null;
  lastVerifiedAt: string | null;
  lastPulledAt: string | null;
  lastPublishedAt: string | null;
  pendingRecords: number;
  remoteRevision: number;
  role: DevkitSyncRole;
  status: "bound" | "conflict" | "disabled" | "error" | "unbound";
};

export type DevkitSyncTokenSummary = {
  createdAt: string;
  createdBy: string;
  label: string;
  lastUsedAt: string | null;
  status: "active" | "revoked";
  uuid: string;
};

export type DevkitSyncResult = {
  direction: "pull" | "push";
  records: number;
  revision: number;
  synchronizedAt: string;
};
