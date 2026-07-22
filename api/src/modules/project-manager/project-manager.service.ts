import { ProjectManagerJsonStore } from "./project-manager.store.js";
import type {
  ProjectManagerKind,
  ProjectManagerRegistrySavePayload,
  ProjectManagerSavePayload
} from "./project-manager.types.js";

export class ProjectManagerService {
  constructor(private readonly store = new ProjectManagerJsonStore()) {}

  list(kind: ProjectManagerKind) {
    return this.store.list(kind);
  }

  create(kind: ProjectManagerKind, input: ProjectManagerSavePayload) {
    return this.store.create(kind, input);
  }

  update(kind: ProjectManagerKind, id: string, input: Partial<ProjectManagerSavePayload>) {
    return this.store.update(kind, id, input);
  }

  deactivate(kind: ProjectManagerKind, id: string) {
    return this.store.setActive(kind, id, false);
  }

  restore(kind: ProjectManagerKind, id: string) {
    return this.store.setActive(kind, id, true);
  }

  delete(kind: ProjectManagerKind, id: string) {
    return this.store.delete(kind, id);
  }

  result() {
    return this.store.result();
  }

  registryResult() {
    return this.store.registryResult();
  }

  listRegistryPlatforms() {
    return this.store.listRegistryPlatforms();
  }

  createRegistryPlatform(input: ProjectManagerRegistrySavePayload) {
    return this.store.createRegistryPlatform(input);
  }

  updateRegistryPlatform(id: string, input: Partial<ProjectManagerRegistrySavePayload>) {
    return this.store.updateRegistryPlatform(id, input);
  }

  listRegistryGroups() {
    return this.store.listRegistryGroups();
  }

  createRegistryGroup(input: ProjectManagerRegistrySavePayload) {
    return this.store.createRegistryGroup(input);
  }

  updateRegistryGroup(id: string, input: Partial<ProjectManagerRegistrySavePayload>) {
    return this.store.updateRegistryGroup(id, input);
  }

  listRegistryModules() {
    return this.store.listRegistryModules();
  }

  createRegistryModule(input: ProjectManagerRegistrySavePayload) {
    return this.store.createRegistryModule(input);
  }

  updateRegistryModule(id: string, input: Partial<ProjectManagerRegistrySavePayload>) {
    return this.store.updateRegistryModule(id, input);
  }

  setRegistryActive(kind: "groups" | "modules" | "platforms", id: string, active: boolean) {
    return this.store.setRegistryActive(kind, id, active);
  }
}
