import { describe, expect, it } from "vitest";
import type { CompassExecutorAdapter, CompassTask } from "./contracts";
import { CompassRunner } from "./runner";

const at = () => new Date("2026-08-23T10:00:00.000Z");

describe("Compass Runner standalone E2E", () => {
  it("runs a multimodal sales lead task through approval, interaction, result, and artifact", async () => {
    const task = makeTask("sales-lead", "Score an inbound lead from a call recording and product screenshot.", "openhands", [
      { kind: "audio", name: "discovery-call.mp3", value: "artifact://call" },
      { kind: "image", name: "requirements.png", value: "artifact://requirements" }
    ]);
    const runner = new CompassRunner(task, scripted("openhands", (context) => {
      if (!context.approved) return approval("Sending a follow-up email will contact a prospect.");
      if (!context.response) return choice("Is the lead qualified?", ["Qualified", "Nurture", "Disqualify"]);
      return result(`Lead marked ${context.response}. Owner: sales-west.`, "lead-score.json");
    }), at);

    expect((await runner.start()).status).toBe("awaiting-approval");
    expect((await runner.decideApproval("approve")).interaction?.choices).toContain("Qualified");
    const completed = await runner.respond("Qualified");
    expect(completed).toMatchObject({ status: "completed", result: "Lead marked Qualified. Owner: sales-west." });
    expect(completed.artifacts).toEqual([{ name: "lead-score.json", mediaType: "application/json", uri: "artifact://lead-score.json" }]);
  });

  it("runs a CRM cleanup task with typed input and keeps execution isolated", async () => {
    const runner = new CompassRunner(makeTask("crm-dedupe", "Resolve duplicate contacts without changing the CRM until confirmed.", "ollama"), scripted("ollama", (context) => {
      if (!context.response) return { kind: "interaction", interaction: { id: "merge", question: "Which contact should remain?", acceptsText: true }, log: "Two probable duplicates found." };
      return result(`Prepared merge plan retaining ${context.response}.`, "merge-plan.md");
    }), at);

    expect((await runner.start()).status).toBe("awaiting-input");
    const completed = await runner.respond("CRM-1024");
    expect(completed.result).toBe("Prepared merge plan retaining CRM-1024.");
    expect(completed.events.map((event) => event.type)).toEqual(["planned", "log", "input-requested", "log", "completed"]);
  });

  it("does not execute when the operator declines approval", async () => {
    let calls = 0;
    const runner = new CompassRunner(makeTask("renewal", "Send renewal quote.", "codex"), { id: "codex", async execute() { calls += 1; return approval("Quote sends an external email."); } }, at);
    await runner.start();
    expect((await runner.decideApproval("decline")).status).toBe("cancelled");
    expect(calls).toBe(1);
  });
});

function makeTask(id: string, objective: string, adapter: CompassTask["adapter"], inputs: CompassTask["inputs"] = [{ kind: "text", name: "request", value: objective }]): CompassTask {
  return { id, title: id, objective, inputs, adapter };
}

function scripted(id: CompassTask["adapter"], execute: (context: Parameters<CompassExecutorAdapter["execute"]>[0]) => Awaited<ReturnType<CompassExecutorAdapter["execute"]>>): CompassExecutorAdapter {
  return { id, async execute(context) { return execute(context); } };
}
function approval(summary: string) { return { kind: "approval" as const, approval: { id: "approve-send", summary, risk: "medium" as const, actions: ["approve", "decline"] as const }, log: "Prepared a protected external action." }; }
function choice(question: string, choices: readonly string[]) { return { kind: "interaction" as const, interaction: { id: "qualification", question, choices, acceptsText: false }, log: "Awaiting sales operator decision." }; }
function result(summary: string, name: string) { return { kind: "result" as const, summary, artifacts: [{ name, mediaType: "application/json", uri: `artifact://${name}` }], log: "Executor returned a structured report." }; }
