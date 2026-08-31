import { describe, expect, it, vi } from "vitest";
import { TaskManagerService } from "./task-manager.service.js";

const actor = "owner@example.com";

function service(options: { projectExists?: boolean; records?: Array<{ id: string }> } = {}) {
  const records = options.records ?? [];
  const repository = {
    create: vi.fn(async (_scope: string, record: unknown) => record),
    createBatch: vi.fn(async (_scope: string, records: unknown) => records),
    list: vi.fn(async () => records),
    reorder: vi.fn(async (_scope: string, next: unknown) => next)
  };
  const notifications = { taskChanged: vi.fn(async () => undefined) };
  const projects = {
    find: vi.fn(async () => (options.projectExists === false ? null : { id: "project-1" }))
  };
  return {
    repository,
    subject: new TaskManagerService(repository as never, notifications as never, projects as never)
  };
}

describe("TaskManagerService validation", () => {
  it("rejects a Todo linked to an unknown project", async () => {
    const { subject } = service({ projectExists: false });
    await expect(
      subject.create("super-admin", { projectId: "missing", title: "Review migration" }, actor)
    ).rejects.toMatchObject({ message: "Todo project was not found." });
  });

  it("allows a Todo without a project", async () => {
    const { repository, subject } = service();
    await subject.create("super-admin", { title: "Review migration" }, actor);
    expect(repository.create).toHaveBeenCalledOnce();
  });

  it("rejects duplicate Todo IDs during reorder", async () => {
    const { repository, subject } = service({ records: [{ id: "todo-1" }] });
    await expect(subject.reorder("super-admin", ["todo-1", "todo-1"], actor)).rejects.toMatchObject(
      { message: "Todo order contains duplicate IDs." }
    );
    expect(repository.reorder).not.toHaveBeenCalled();
  });

  it("creates an approved task plan as one batch", async () => {
    const { repository, subject } = service();
    await subject.createBatch(
      "super-admin",
      [
        { projectId: "project-1", title: "Inspect the current workflow" },
        { projectId: "project-1", title: "Add the approved task card" }
      ],
      actor
    );
    expect(repository.createBatch).toHaveBeenCalledOnce();
    expect(repository.create).not.toHaveBeenCalled();
  });
});
