import { describe, expect, it } from "vitest";
import { statusTone, todoDate } from "../src/TodoMetadata";

describe("Todo metadata", () => {
  it("formats a past date and its age", () => {
    expect(todoDate("2026-08-23", new Date(2026, 7, 30))).toEqual({
      formatted: "23-08-2026",
      relative: "7d ago"
    });
  });

  it("formats today and future dates", () => {
    expect(todoDate("2026-08-30", new Date(2026, 7, 30))?.relative).toBe("today");
    expect(todoDate("2026-09-06", new Date(2026, 7, 30))?.relative).toBe("in 7d");
  });

  it("rejects an invalid calendar date", () => {
    expect(todoDate("2026-02-31", new Date(2026, 7, 30))).toBeNull();
  });

  it("maps known statuses to badge tones", () => {
    expect(statusTone("Open")).toBe("open");
    expect(statusTone("Blocked")).toBe("blocked");
    expect(statusTone("In Progress")).toBe("in-progress");
    expect(statusTone("Completed")).toBe("completed");
  });
});
