import { describe, expect, it } from "vitest";
import { validateSynchronizedRow } from "./sync.repository.js";

describe("sync Todo validation", () => {
  it("keeps a valid public visibility", () => {
    expect(
      validateSynchronizedRow("devkit_task_manager_todos", { uuid: "todo-1", visibility: "public" })
    ).toMatchObject({ uuid: "todo-1", visibility: "public" });
  });

  it("defaults an older Todo snapshot to private", () => {
    expect(validateSynchronizedRow("devkit_task_manager_todos", { uuid: "todo-1" })).toMatchObject({
      uuid: "todo-1",
      visibility: "private"
    });
  });

  it("rejects an unsupported Todo visibility", () => {
    expect(() =>
      validateSynchronizedRow("devkit_task_manager_todos", {
        uuid: "todo-1",
        visibility: "shared"
      })
    ).toThrow();
  });
});
