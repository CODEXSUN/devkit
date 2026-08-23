import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Check, CircleDotDashed, FileOutput, ShieldCheck } from "lucide-react";
import type { CompassDirective, CompassExecutionContext, CompassExecutorAdapter, CompassSnapshot, CompassTask } from "../standalone/compass-runner/contracts";
import { CompassRunner } from "../standalone/compass-runner/runner";
import type { CompassReleaseEvent } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";

type ScenarioId = "devkit-release";
type Scenario = { id: ScenarioId; label: string; description: string; task: CompassTask; execute: (context: CompassExecutionContext) => CompassDirective };
type ReleasePhase = "idle" | "version-bump" | "commit-push" | "publish-release" | "completed";
type ReleaseStageId = "preflight" | "version" | "commit" | "publish";
type ReleaseStageStatus = "pending" | "running" | "awaiting-approval" | "completed" | "failed";
type ReleaseSession = { phase: ReleasePhase; stages: Record<ReleaseStageId, ReleaseStageStatus> };

const releaseSessionKey = "devkit.compass-release-session";

const releaseStages: readonly { id: ReleaseStageId; label: string }[] = [
  { id: "preflight", label: "Preflight" },
  { id: "version", label: "Version and changelog" },
  { id: "commit", label: "Commit and push" },
  { id: "publish", label: "Publish and verify" }
];

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
  const [session, setSession] = useState<ReleaseSession>(() => readReleaseSession());
  const sessionRef = useRef(session);
  const { phase, stages } = session;
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    void listen<CompassReleaseEvent>("compass-release-event", (event) => setEvents((current) => [...current, event.payload])).then((cleanup) => {
      if (disposed) cleanup();
      else unlisten = cleanup;
    });
    return () => { disposed = true; unlisten?.(); };
  }, []);
  function setStage(stage: ReleaseStageId, status: ReleaseStageStatus) {
    updateSession((current) => ({ ...current, stages: { ...current.stages, [stage]: status } }));
  }
  function setPhase(phase: ReleasePhase) {
    updateSession((current) => ({ ...current, phase }));
  }
  function updateSession(update: (current: ReleaseSession) => ReleaseSession) {
    const next = update(sessionRef.current);
    sessionRef.current = next;
    saveReleaseSession(next);
    setSession(next);
  }
  function resetSession() {
    const next = { phase: "idle" as const, stages: createReleaseStages() };
    sessionRef.current = next;
    clearReleaseSession();
    setSession(next);
  }

  async function execute(action: "inspect" | "validate" | "version-bump" | "commit-push" | "publish-release", stage: ReleaseStageId) {
    setBusy(true);
    setError(undefined);
    setStage(stage, "running");
    try {
      await desktopClient.runCompassReleaseStep(action, "Compass Runner live release flow");
      setStage(stage, "completed");
      return true;
    } catch (cause) {
      setStage(stage, "failed");
      setError(cause instanceof Error ? cause.message : String(cause));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function requestApproval(next: Exclude<ReleasePhase, "idle" | "completed">) {
    setPhase(next);
    setStage(stageForPhase(next), "awaiting-approval");
  }

  async function start() {
    setEvents([]);
    resetSession();
    if (!await execute("inspect", "preflight")) return;
    if (!await execute("validate", "preflight")) return;
    requestApproval("version-bump");
  }

  async function approve() {
    if (phase === "version-bump") {
      if (await execute("version-bump", "version")) requestApproval("commit-push");
      return;
    }
    if (phase === "commit-push") {
      if (await execute("commit-push", "commit")) requestApproval("publish-release");
      return;
    }
    if (phase === "publish-release" && await execute("publish-release", "publish")) setPhase("completed");
  }

  return <section className="compass-live-worker">
    <p>Every release stage remains pending, running, awaiting approval, completed, or failed. Publication completes only after GitHub verifies the public release assets.</p>
    <ol className="compass-release-stages" aria-label="Release stage status">{releaseStages.map((stage) => <li className={stages[stage.id]} key={stage.id}><strong>{stage.label}</strong><span>{stageStatusLabel(stages[stage.id])}</span></li>)}</ol>
    <footer><button className="compass-release-start" disabled={busy} onClick={() => void start()} type="button">{busy ? "Running release stage…" : "Run release process"}</button><button disabled={busy} onClick={() => void execute("inspect", "preflight")} type="button">Inspect repository</button><button disabled={busy} onClick={() => void execute("validate", "preflight")} type="button">Run checks</button><button disabled={busy} onClick={() => requestApproval("version-bump")} type="button">Version + changelog</button><button disabled={busy} onClick={() => requestApproval("commit-push")} type="button">Commit + push</button><button disabled={busy} onClick={() => requestApproval("publish-release")} type="button">Publish release</button></footer>
    {phase === "completed" ? <section className="compass-result"><Check size={19} /><div><strong>Release published and verified</strong><p>GitHub completed the release workflow and the repository publisher verified the required public assets.</p></div></section> : null}
    {needsRestartRecovery(phase, stages, busy) ? <section className="compass-decision"><ShieldCheck size={19} /><div><strong>Version update needs recovery</strong><p>The desktop restarted while the approved version update changed its Tauri configuration. Inspect the version and changelog, then request the next approval only if the update is present.</p><footer><button onClick={resetSession} type="button">Reset process</button><button className="compass-primary" onClick={() => requestApproval("commit-push")} type="button">Continue to commit approval</button></footer></div></section> : null}
    {isAwaitingApproval(phase, stages) ? <section className="compass-decision"><ShieldCheck size={19} /><div><strong>Live approval required</strong><p>{approvalSummary(phase)}</p><footer><button onClick={resetSession} type="button">Stop process</button><button className="compass-primary" disabled={busy} onClick={() => void approve()} type="button">{busy ? "Running…" : "Approve and continue"}</button></footer></div></section> : null}
    {error ? <p className="compass-error">{error}</p> : null}
    <ol className="compass-log">{events.map((event, index) => <li key={`${event.kind}-${index}`}><time>{event.kind}</time><span>{event.message}</span></li>)}</ol>
  </section>;
}

function createReleaseStages(): Record<ReleaseStageId, ReleaseStageStatus> { return { preflight: "pending", version: "pending", commit: "pending", publish: "pending" }; }
function readReleaseSession(): ReleaseSession {
  if (typeof window === "undefined") return { phase: "idle", stages: createReleaseStages() };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(releaseSessionKey) ?? "") as Partial<ReleaseSession>;
    if (!parsed.phase || !parsed.stages) return { phase: "idle", stages: createReleaseStages() };
    return { phase: parsed.phase, stages: { ...createReleaseStages(), ...parsed.stages } };
  } catch { return { phase: "idle", stages: createReleaseStages() }; }
}
function saveReleaseSession(session: ReleaseSession) { if (typeof window !== "undefined") window.localStorage.setItem(releaseSessionKey, JSON.stringify(session)); }
function clearReleaseSession() { if (typeof window !== "undefined") window.localStorage.removeItem(releaseSessionKey); }
function stageForPhase(phase: Exclude<ReleasePhase, "idle" | "completed">): ReleaseStageId { return phase === "version-bump" ? "version" : phase === "commit-push" ? "commit" : "publish"; }
function isApprovalPhase(phase: ReleasePhase): phase is Exclude<ReleasePhase, "idle" | "completed"> { return phase === "version-bump" || phase === "commit-push" || phase === "publish-release"; }
function isAwaitingApproval(phase: ReleasePhase, stages: Record<ReleaseStageId, ReleaseStageStatus>) { return isApprovalPhase(phase) && stages[stageForPhase(phase)] === "awaiting-approval"; }
function needsRestartRecovery(phase: ReleasePhase, stages: Record<ReleaseStageId, ReleaseStageStatus>, busy: boolean) { return !busy && phase === "version-bump" && stages.version === "running"; }
function approvalSummary(phase: ReleasePhase) { return phase === "version-bump" ? "Write repository version references and the release changelog." : phase === "commit-push" ? "Synchronise Git, stage reviewed files, commit, and push." : "Create the release tag, wait for GitHub, and verify the public release assets."; }
function stageStatusLabel(status: ReleaseStageStatus) { return status.replaceAll("-", " "); }


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
