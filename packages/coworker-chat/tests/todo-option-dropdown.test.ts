import { describe, expect, it } from "vitest";
import { nextOptionIndex } from "../src/TodoOptionDropdown";

describe("Todo dropdown keyboard navigation", () => {
  it("moves and wraps through the options", () => {
    expect(nextOptionIndex("ArrowDown", 2, 3)).toBe(0);
    expect(nextOptionIndex("ArrowUp", 0, 3)).toBe(2);
  });

  it("supports Home and End", () => {
    expect(nextOptionIndex("Home", 2, 4)).toBe(0);
    expect(nextOptionIndex("End", 0, 4)).toBe(3);
  });

  it("ignores unrelated keys", () => {
    expect(nextOptionIndex("Tab", 1, 3)).toBeNull();
  });
});
