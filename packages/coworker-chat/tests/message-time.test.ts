import assert from "node:assert/strict";
import test from "node:test";
import { formatMessageDate, formatMessageTimestamp } from "../src/MessengerWorkspace";

test("message timestamp includes date, local time, and elapsed time", () => {
  const created = new Date(2026, 8, 1, 13, 6);
  const now = new Date(2026, 8, 1, 16, 56).getTime();
  assert.equal(formatMessageTimestamp(created.toISOString(), now), "01-Sep - 01:06 pm (3h 50m ago)");
});

test("message date uses friendly labels for recent days", () => {
  const now = new Date(2026, 8, 1, 16, 56).getTime();
  assert.equal(formatMessageDate(new Date(2026, 8, 1, 8, 0).toISOString(), now), "Today");
  assert.equal(formatMessageDate(new Date(2026, 7, 31, 23, 0).toISOString(), now), "Yesterday");
});

test("message date uses a compact calendar date for older history", () => {
  const now = new Date(2026, 8, 1, 16, 56).getTime();
  assert.equal(formatMessageDate(new Date(2026, 7, 18, 12, 0).toISOString(), now), "18/08/2026");
});
