import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Check, CircleDotDashed, FileOutput, ShieldCheck } from "lucide-react";
import type { CompassDirective, CompassExecutionContext, CompassExecutorAdapter, CompassSnapshot, CompassTask } from "../standalone/compass-runner/contracts";
import { CompassRunner } from "../standalone/compass-runner/runner";
import type { CompassReleaseEvent } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";

type ScenarioId = "devkit-release";
type Scenario = { id: ScenarioId; label: string; description: string; task: CompassTask; execute: (context: CompassExecutionContext) => CompassDirective };

const scenarios: readonly Scenario[] = [
  createDevKitReleaseScenario()
];

export function CompassRunnerWorkspace() {
  const [scenario, setScenario] = useState<Scenario>(() => scenarios[0]!);
  const [runner, setRunner] = useState(() => makeRunner(scenarios[0]!));
  const [snapshot, setSnapshot] = useState<CompassSnapshot>(() => runner.snapshot());

  function selectScenario(id: ScenarioId) {
    const nextScenario = scenarios.find((item) => item.id === id) ?? scenarios[0]!;
    const nextRunner = makeRunner(nextScenario);
    setScenario(nextScenario);
    setRunner(nextRunner);
    setSnapshot(nextRunner.snapshot());
  }

  return <section className="compass-runner" aria-label="Compass Runner standalone prototype">
    <header className="compass-header"><div><p className="compass-eyebrow"><CircleDotDashed size={15} /> Standalone release worker</p><h1>Compass Runner</h1><p>Release preflight, approvals, observed console output, and evidence for this repository. It is separate from DevKit Tasks, Projects, chat, and the database.</p></div><label>Scenario<select aria-label="Compass scenario" onChange={(event) => selectScenario(event.target.value as ScenarioId)} value={scenario.id}>{scenarios.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></header>
    <div className="compass-layout">
      <aside className="compass-context"><h2>{scenario.task.title}</h2><p>{scenario.description}</p><dl><div><dt>Adapter</dt><dd>{scenario.task.adapter}</dd></div><div><dt>Objective</dt><dd>{scenario.task.objective}</dd></div></dl><h3>Inputs</h3><ul>{scenario.task.inputs.map((input) => <li key={input.name}><FileOutput size={15} /><span><strong>{input.name}</strong><small>{input.kind}</small></span></li>)}</ul></aside>
      <main className="compass-run"><section className="compass-stages" aria-label="Run stages">{["Inspect", "Approve", "Execute", "Report"].map((stage, index) => <div className={stageClass(index, snapshot.status)} key={stage}><span>{stageDone(index, snapshot.status) ? <Check size={14} /> : index + 1}</span><strong>{stage}</strong></div>)}</section><section className="compass-live"><header><div><p>Live release execution</p><h2>Ready for repository preflight</h2></div><span className="compass-status draft">release worker</span></header><LiveReleaseWorker /></section></main>
    </div>
  </section>;
}

function LiveReleaseWorker() {
  const [events, setEvents] = useState<CompassReleaseEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [phase, setPhase] = useState<"idle" | "version-bump" | "commit-push" | "publish-release" | "completed">("idle");
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    void listen<CompassReleaseEvent>("compass-release-event", (event) => setEvents((current) => [...current, event.payload])).then((cleanup) => {
      if (disposed) cleanup();
      else unlisten = cleanup;
    });
    return () => { disposed = true; unlisten?.(); };
  }, []);
  async function execute(action: "inspect" | "validate" | "version-bump" | "commit-push" | "publish-release") { setBusy(true); setError(undefined); try { await desktopClient.runCompassReleaseStep(action, "Compass Runner live release flow"); return true; } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); return false; } finally { setBusy(false); } }
  async function start() { setEvents([]); if (!await execute("inspect")) return; if (!await execute("validate")) return; setPhase("version-bump"); }
  async function approve() { if (phase === "version-bump") { if (await execute("version-bump")) setPhase("commit-push"); return; } if (phase === "commit-push") { if (await execute("commit-push")) setPhase("publish-release"); return; } if (phase === "publish-release" && await execute("publish-release")) setPhase("completed"); }
  return <section className="compass-live-worker"><p>One guided release process performs live inspection and validation first; stage controls remain available for review or recovery.</p><footer><button className="compass-release-start" disabled={busy} onClick={() => void start()} type="button">{busy ? "Running preflight…" : "Run release process"}</button><button disabled={busy} onClick={() => void execute("inspect")} type="button">Inspect repository</button><button disabled={busy} onClick={() => void execute("validate")} type="button">Run checks</button><button disabled={busy} onClick={() => setPhase("version-bump")} type="button">Version + changelog</button><button disabled={busy} onClick={() => setPhase("commit-push")} type="button">Commit + push</button><button disabled={busy} onClick={() => setPhase("publish-release")} type="button">Publish release</button></footer>{phase === "completed" ? <section className="compass-result"><Check size={19} /><div><strong>Release worker completed</strong><p>Review the console evidence and external release workflow before treating publication as complete.</p></div></section> : null}{["version-bump", "commit-push", "publish-release"].includes(phase) ? <section className="compass-decision"><ShieldCheck size={19} /><div><strong>Live approval required</strong><p>{phase === "version-bump" ? "Write repository version references and changelog." : phase === "commit-push" ? "Stage non-ignored changed files, commit, and push." : "Create and push the release tag, then start the release workflow."}</p><footer><button onClick={() => setPhase("idle")} type="button">Stop process</button><button className="compass-primary" disabled={busy} onClick={() => void approve()} type="button">{busy ? "Running…" : "Approve and continue"}</button></footer></div></section> : null}{error ? <p className="compass-error">{error}</p> : null}<ol className="compass-log">{events.map((event, index) => <li key={`${event.kind}-${index}`}><time>{event.kind}</time><span>{event.message}</span></li>)}</ol></section>;
}


function makeRunner(scenario: Scenario) { const adapter: CompassExecutorAdapter = { id: scenario.task.adapter, async execute(context) { return scenario.execute(context); } }; return new CompassRunner(scenario.task, adapter); }
function createDevKitReleaseScenario(): Scenario {
  let phase = 0;
  return {
    id: "devkit-release",
    label: "DevKit release readiness",
    description: "Live repository preflight, explicit approvals, Git synchronisation, commit/push, tag, and release evidence.",
    task: { id: "devkit-release", title: "Prepare DevKit IDE release", objective: "Prepare the next repository release safely with observed evidence and protected write approvals.", adapter: "opencode", inputs: [{ kind: "document", name: "github-now-output.txt", value: "artifact://github-now" }, { kind: "document", name: "release-notes-standard.md", value: "artifact://release-standard" }] },
    execute(context) {
      if (phase === 0) { phase = 1; return choice("Current changelog version is 1.0.77. What should happen next?", ["Bump to 1.0.78", "Review scope only", "Cancel release"]); }
      if (phase === 1) {
        if (context.response === "Cancel release") return completed("Release preparation cancelled. No files, Git state, tags, or releases changed.", "release-decision.md");
        phase = 2;
        return approval("Update every repository-owned version reference and draft a changelog with Database Changes, App Codebase Changes, and Verification sections.");
      }
      if (phase === 2) { phase = 3; return choice("Preflight review complete: ignore .gitignore and temporary files; analyse remote changes before any merge. Continue?", ["Pull if needed, then commit and push", "Stop after analysis"]); }
      if (phase === 3) {
        if (context.response === "Stop after analysis") return completed("Preflight report prepared. No commit, push, tag, or release was created.", "release-preflight.md");
        phase = 4;
        return approval("Create the verified commit, push it, confirm the remote commit, then create and publish the release tag and IDE build.");
      }
      return completed("Release readiness report prepared: version references, changelog sections, code scope, Git status, remote analysis, verification, commit/push, tag, and IDE release are all gated pending live executor integration.", "release-evidence.md");
    }
  };
}

function approval(summary: string): CompassDirective { return { kind: "approval", approval: { id: "protected-external-action", summary, risk: "medium", actions: ["approve", "decline"] }, log: "Prepared a protected external action." }; }
function choice(question: string, choices: readonly string[]): CompassDirective { return { kind: "interaction", interaction: { id: "lead-status", question, choices, acceptsText: false }, log: "Awaiting sales operator decision." }; }
function completed(summary: string, name: string): CompassDirective { return { kind: "result", summary, artifacts: [{ name, mediaType: "application/json", uri: `artifact://${name}` }], log: "Local simulated adapter returned a structured report." }; }
function stageDone(index: number, status: CompassSnapshot["status"]) { return status === "completed" || status === "cancelled" || (index === 0 && status !== "draft") || (index === 1 && !["draft", "planning", "awaiting-approval"].includes(status)) || (index === 2 && ["awaiting-input", "completed", "failed", "cancelled"].includes(status)); }
function stageClass(index: number, status: CompassSnapshot["status"]) {
  if (stageDone(index, status)) return "done";
  const active = (index === 1 && status === "awaiting-approval") || (index === 2 && ["running", "awaiting-input"].includes(status));
  return active ? "active" : "";
}
