import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/devkit-api";
import type {
  ProjectManagerKind,
  ProjectManagerRecord,
  ProjectManagerResult
} from "./project-manager.types";

export function getProjectManagerResult() {
  return apiGet<ProjectManagerResult>("/admin/project-manager/result", "sa");
}

export function listProjectManagerRecords(kind: ProjectManagerKind) {
  return apiGet<ProjectManagerRecord[]>(`/admin/project-manager/${kind}`, "sa");
}

export function createProjectManagerRecord(
  kind: ProjectManagerKind,
  payload: Record<string, unknown>
) {
  return apiPost<ProjectManagerRecord>(`/admin/project-manager/${kind}`, payload, "sa");
}

export function updateProjectManagerRecord(
  kind: ProjectManagerKind,
  id: string,
  payload: Record<string, unknown>
) {
  return apiPut<ProjectManagerRecord>(`/admin/project-manager/${kind}/${id}`, payload, "sa");
}

export function deactivateProjectManagerRecord(kind: ProjectManagerKind, id: string) {
  return apiPost<ProjectManagerRecord>(`/admin/project-manager/${kind}/${id}/deactivate`, {}, "sa");
}

export function restoreProjectManagerRecord(kind: ProjectManagerKind, id: string) {
  return apiPost<ProjectManagerRecord>(`/admin/project-manager/${kind}/${id}/restore`, {}, "sa");
}

export function deleteProjectManagerRecord(kind: ProjectManagerKind, id: string) {
  return apiDelete<{ deleted: boolean; id: string; title: string }>(
    `/admin/project-manager/${kind}/${id}`,
    "sa"
  );
}
