import { apiGet, apiPost, apiPut } from "../../shared/api/devkit-api";
import type {
  DeveloperRepository,
  RepositoryConnection,
  RepositoryConnectionInput
} from "./repository-settings.types";

export const listRepositoryConnections = () =>
  apiGet<RepositoryConnection[]>("/admin/repository-connections");

export const listDeveloperRepositories = () =>
  apiGet<DeveloperRepository[]>("/project-manager/repositories");

export const createRepositoryConnection = (input: RepositoryConnectionInput) =>
  apiPost<RepositoryConnection[]>("/admin/repository-connections", input);

export const updateRepositoryConnection = (id: string, input: RepositoryConnectionInput) =>
  apiPut<RepositoryConnection[]>(`/admin/repository-connections/${encodeURIComponent(id)}`, input);

export const selectLocalRepositoryFolder = () =>
  apiPost<{ path: string }>("/project-manager/select-local-folder");
