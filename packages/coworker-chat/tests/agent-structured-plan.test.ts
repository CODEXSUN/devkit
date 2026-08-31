import assert from "node:assert/strict";
import test from "node:test";
import { parseAgentStructuredPlan } from "../src/agent-structured-plan";

test("structured plans expose independently selectable implementation tasks", () => {
  const plan = parseAgentStructuredPlan(`
## Proposal
- Use the existing shared agent workspace.
## Assumptions
- The API is available locally.
## Risks and alternatives
- Existing clients may have stale sessions.
## Implementation tasks
1. Add a durable task conversion card.
2. Link created tasks to the source conversation.
## Acceptance criteria
- Users approve selected tasks before creation.
## Test plan
- Run typecheck and focused tests.
`);

  assert.deepEqual(plan?.tasks, [
    "Add a durable task conversion card.",
    "Link created tasks to the source conversation."
  ]);
  assert.deepEqual(plan?.acceptance, ["Users approve selected tasks before creation."]);
  assert.deepEqual(plan?.tests, ["Run typecheck and focused tests."]);
});

test("unstructured answers do not display the task conversion card", () => {
  assert.equal(parseAgentStructuredPlan("A short answer without a structured task section."), null);
});
