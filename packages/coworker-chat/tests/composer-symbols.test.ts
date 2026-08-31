import assert from "node:assert/strict";
import test from "node:test";
import { composerSuggestions, findComposerTrigger } from "../src/composer-symbols";

test("at symbol suggests people and roles", () => {
  const trigger = findComposerTrigger("Please ask @ass", 15);
  assert.equal(trigger?.kind, "@");
  assert.equal(composerSuggestions(trigger, []).some((item) => item.value === "@assignee"), true);
});

test("slash symbol suggests executable chat actions", () => {
  const trigger = findComposerTrigger("/fil", 4);
  assert.equal(trigger?.kind, "/");
  assert.equal(composerSuggestions(trigger, []).some((item) => item.value === "/filter #"), true);
});

test("hash symbol suggests existing and common tags", () => {
  const existing = composerSuggestions(findComposerTrigger("Track #rel", 10), ["release"]);
  const common = composerSuggestions(findComposerTrigger("#dec", 4), []);
  assert.equal(existing.some((item) => item.value === "#release "), true);
  assert.equal(common.some((item) => item.value === "#decision "), true);
});
