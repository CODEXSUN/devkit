import assert from "node:assert/strict";
import test from "node:test";
import { planningSceneFromSerialized } from "../src/web/src/modules/planning/planning.scene.ts";

test("normalizes Excalidraw export metadata into the persisted scene contract", () => {
  const scene = planningSceneFromSerialized(
    JSON.stringify({
      appState: { viewBackgroundColor: "#ffffff" },
      elements: [{ id: "shape-1", type: "rectangle" }],
      files: { image1: { id: "image1" } },
      source: "https://excalidraw.com",
      type: "excalidraw",
      version: 2,
    }),
  );

  assert.deepEqual(scene, {
    appState: { viewBackgroundColor: "#ffffff" },
    elements: [{ id: "shape-1", type: "rectangle" }],
    files: { image1: { id: "image1" } },
  });
  assert.equal("type" in scene, false);
  assert.equal("version" in scene, false);
  assert.equal("source" in scene, false);
});
