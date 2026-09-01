import { describe, expect, it, vi } from "vitest";
import { ProjectManagerService } from "./project-manager.service.js";
import type { ProjectManagerKind, ProjectManagerRecord } from "./project-manager.types.js";

const associatedActor = { email: "member@example.com", id: "user-1", permissions: [], roles: [] };

describe("ProjectManagerService project access", () => {
  it("shows project records only to associated users", async () => {
    const project = record("project", "project-1", "", "member@example.com");
    const note = record("discussion", "note-1", project.id);
    const hiddenProject = record("project", "project-2", "", "other@example.com");
    const hiddenNote = record("discussion", "note-2", hiddenProject.id);
    const subject = service([project, note, hiddenProject, hiddenNote]);

    await expect(subject.listForActor("project", associatedActor)).resolves.toEqual([project]);
    await expect(subject.listForActor("discussion", associatedActor)).resolves.toEqual([note]);
    await expect(subject.requireActorAccess("discussion", hiddenNote.id, associatedActor)).rejects.toMatchObject({
      message: "This record belongs to a project that is not associated with you."
    });
  });

  it("keeps global records visible and lets Super Admin recover every project", async () => {
    const project = record("project", "project-1", "", "other@example.com");
    const globalNote = record("discussion", "note-1");
    const subject = service([project, globalNote]);

    await expect(subject.listForActor("discussion", associatedActor)).resolves.toEqual([globalNote]);
    await expect(subject.listForActor("project", { ...associatedActor, roles: ["super_admin"] })).resolves.toEqual([project]);
  });
});

function service(records: ProjectManagerRecord[]) {
  const repository = {
    find: vi.fn(async (kind: ProjectManagerKind, id: string) => records.find((record) => record.kind === kind && record.id === id) ?? null),
    list: vi.fn(async (kind: ProjectManagerKind) => records.filter((record) => record.kind === kind))
  };
  return new ProjectManagerService(repository as never);
}

function record(kind: ProjectManagerKind, id: string, referenceId = "", assignee = ""): ProjectManagerRecord {
  return {
    active: true, assignee, colorKey: "", createdAt: "2026-09-01T00:00:00.000Z", description: "",
    dueDate: "", id, key: id, kind, lane: "", logoText: "", moduleKey: "project-manager",
    priority: "medium", referenceId, referenceType: referenceId ? "project" : "", repositoryName: "",
    repositoryUrl: "", sortOrder: 0, startDate: "", status: "active", title: id, type: kind,
    updatedAt: "2026-09-01T00:00:00.000Z"
  };
}
