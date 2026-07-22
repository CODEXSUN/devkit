import type {
  ProjectManagerKind,
  ProjectManagerRecord,
  ProjectManagerRegistryResult,
  ProjectManagerResult
} from "./project-manager.types.js";

export class ProjectManagerRepository {
  summarize(records: ProjectManagerRecord[]): ProjectManagerResult["summary"] {
    return records.reduce(
      (summary, record) => ({
        active: summary.active + (record.active ? 1 : 0),
        blocked: summary.blocked + (record.status === "blocked" ? 1 : 0),
        completed: summary.completed + (record.status === "completed" ? 1 : 0),
        total: summary.total + 1
      }),
      { active: 0, blocked: 0, completed: 0, total: 0 }
    );
  }

  groupByKind(records: ProjectManagerRecord[]) {
    return records.reduce<Record<ProjectManagerKind, ProjectManagerRecord[]>>(
      (groups, record) => {
        groups[record.kind].push(record);
        return groups;
      },
      {
        activity: [],
        discussion: [],
        issue: [],
        kanban: [],
        release: [],
        review: [],
        task: [],
        timeline: [],
        todo: []
      }
    );
  }

  countRegistry(registry: ProjectManagerRegistryResult) {
    return registry.summary;
  }
}
