import { apiGet, apiPost, apiPut } from "../../shared/api/devkit-api";
import type {
  ProjectManagerRegistryGroup,
  ProjectManagerRegistryModule,
  ProjectManagerRegistryPlatform,
  ProjectManagerRegistryResult
} from "../project-manager/project-manager.types";

export function getPlatformRegistryResult() {
  return apiGet<ProjectManagerRegistryResult>("/admin/project-manager/registry/result", "sa");
}

export function savePlatformRegistryPlatform(
  payload: Partial<ProjectManagerRegistryPlatform> & { key: string; name: string }
) {
  return payload.id
    ? apiPut<ProjectManagerRegistryPlatform>(
        `/admin/project-manager/registry/platforms/${payload.id}`,
        payload,
        "sa"
      )
    : apiPost<ProjectManagerRegistryPlatform>(
        "/admin/project-manager/registry/platforms",
        payload,
        "sa"
      );
}

export function savePlatformRegistryGroup(
  payload: Partial<ProjectManagerRegistryGroup> & { key: string; name: string; platformId: string }
) {
  return payload.id
    ? apiPut<ProjectManagerRegistryGroup>(
        `/admin/project-manager/registry/groups/${payload.id}`,
        payload,
        "sa"
      )
    : apiPost<ProjectManagerRegistryGroup>("/admin/project-manager/registry/groups", payload, "sa");
}

export function savePlatformRegistryModule(
  payload: Partial<ProjectManagerRegistryModule> & { groupId: string; key: string; name: string }
) {
  return payload.id
    ? apiPut<ProjectManagerRegistryModule>(
        `/admin/project-manager/registry/modules/${payload.id}`,
        payload,
        "sa"
      )
    : apiPost<ProjectManagerRegistryModule>(
        "/admin/project-manager/registry/modules",
        payload,
        "sa"
      );
}

export function setPlatformRegistryActive(
  kind: "groups" | "modules" | "platforms",
  id: string,
  active: boolean
) {
  return apiPost<
    ProjectManagerRegistryGroup | ProjectManagerRegistryModule | ProjectManagerRegistryPlatform
  >(`/admin/project-manager/registry/${kind}/${id}/${active ? "restore" : "deactivate"}`, {}, "sa");
}
