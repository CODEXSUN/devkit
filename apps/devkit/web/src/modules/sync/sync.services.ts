import { apiGet, apiPost } from "../../shared/api/devkit-api";
import type { GeneratedSyncToken, SyncResult, SyncStatus } from "./sync.types";

export const getSyncStatus = () => apiGet<SyncStatus>("/admin/sync/status");

export const generateSyncToken = (label: string) =>
  apiPost<GeneratedSyncToken>("/admin/sync/cloud/tokens", { label });

export const bindSyncCloud = (instanceId: string, token: string) =>
  apiPost<SyncStatus>("/admin/sync/bind", { instanceId, token });

export const publishSyncCloud = () =>
  apiPost<SyncResult>("/admin/sync/publish");

export const pullSyncCloud = () => apiPost<SyncResult>("/admin/sync/pull");
