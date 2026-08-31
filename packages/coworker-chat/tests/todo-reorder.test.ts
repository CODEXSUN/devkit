import { describe, expect, it } from "vitest";
import { dropPlacement, reorderById } from "../src/TodoReorder";

const items = ["a", "b", "c", "d"].map((id) => ({ id }));
const ids = (value: typeof items) => value.map((item) => item.id);

describe("Todo reorder", () => {
  it("detects placement from the row midpoint", () => {
    expect(dropPlacement(110, 100, 40)).toBe("before");
    expect(dropPlacement(130, 100, 40)).toBe("after");
  });

  it("moves down before and after a target", () => {
    expect(ids(reorderById(items, "a", "c", "before"))).toEqual(["b", "a", "c", "d"]);
    expect(ids(reorderById(items, "a", "c", "after"))).toEqual(["b", "c", "a", "d"]);
  });

  it("moves up before and after a target", () => {
    expect(ids(reorderById(items, "d", "b", "before"))).toEqual(["a", "d", "b", "c"]);
    expect(ids(reorderById(items, "d", "b", "after"))).toEqual(["a", "b", "d", "c"]);
  });

  it("ignores invalid and self moves", () => {
    expect(reorderById(items, "a", "a", "before")).toBe(items);
    expect(reorderById(items, "missing", "a", "before")).toBe(items);
  });
});
