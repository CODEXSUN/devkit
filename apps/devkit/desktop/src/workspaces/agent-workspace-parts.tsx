import {
  Bot,
  CheckCircle2,
  ChevronDown,
  Code2,
  FileDiff,
  GitBranch,
  LoaderCircle,
  Play,
  Search,
  ShieldCheck,
  TerminalSquare
} from "lucide-react";
import { useEffect, useState } from "react";
import type { FileEntry, GitChange, Workspace } from "../contracts/desktop";
import type { ResourceState } from "../shell/use-desktop-session";

export type RunItem = { id: string; label: string; status: string; type: string };
export type Approval = { id: number; command: string; reason: string };
type Decision = "accept" | "acceptForSession" | "decline";

export function AgentWelcome({
  workspace,
  onPrompt
}: {
  workspace: Workspace;
  onPrompt: (value: string) => void;
}) {
  const prompts = ["Explain this codebase", "Find and fix a bug", "Review the current changes"];
  return (
    <div className="agent-welcome">
      <div className="agent-mark"><Bot size={25} /></div>
      <h1>Build in {workspace.name}</h1>
      <p>
        Codex can read this workspace, edit files, run commands, and verify the result with your
        approval.
      </p>
      <div>
        {prompts.map((prompt) => (
          <button key={prompt} onClick={() => onPrompt(prompt)} type="button">{prompt}</button>
        ))}
      </div>
    </div>
  );
}

export function RunTimeline({ items }: { items: RunItem[] }) {
  const activeCount = items.filter(isActiveRunItem).length;
  const [expanded, setExpanded] = useState(activeCount > 0);
  const [showAll, setShowAll] = useState(false);
  const visibleItems = showAll ? items : items.slice(-RUN_ITEM_LIMIT);
  const hiddenCount = items.length - visibleItems.length;

  useEffect(() => {
    if (activeCount > 0) {
      setExpanded(true);
      setShowAll(false);
      return;
    }

    const timer = window.setTimeout(() => setExpanded(false), 900);
    return () => window.clearTimeout(timer);
  }, [activeCount]);

  return (
    <section className={`run-timeline${activeCount ? " active" : ""}`}>
      <button
        aria-expanded={expanded}
        className="run-summary"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        {activeCount ? <LoaderCircle className="spin" size={15} /> : <CheckCircle2 size={15} />}
        <span>
          <strong>{activeCount ? "Agent working" : "Work completed"}</strong>
          <small>{runSummary(items.length, activeCount)}</small>
        </span>
        <ChevronDown className={expanded ? "expanded" : ""} size={14} />
      </button>
      {expanded ? (
        <div className="run-list" role="status">
          {hiddenCount > 0 ? (
            <button className="run-show-more" onClick={() => setShowAll(true)} type="button">
              Show {hiddenCount} earlier {hiddenCount === 1 ? "action" : "actions"}
            </button>
          ) : null}
          {visibleItems.map((item) => (
            <div className={isActiveRunItem(item) ? "run-item active" : "run-item"} key={item.id}>
              <RunItemIcon item={item} />
              <span title={item.label}>{item.label}</span>
              <small>{statusLabel(item.status)}</small>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function isActiveRunItem(item: RunItem) {
  return !["cancelled", "canceled", "completed", "declined", "failed", "success"].includes(
    item.status.toLowerCase()
  );
}

function RunItemIcon({ item }: { item: RunItem }) {
  if (item.type === "commandExecution") return <TerminalSquare size={14} />;
  if (item.type === "webSearch") return <Search size={14} />;
  return <Code2 size={14} />;
}

function runSummary(total: number, active: number) {
  if (active) return `${active} active · ${total} ${total === 1 ? "action" : "actions"}`;
  return `${total} ${total === 1 ? "action" : "actions"}`;
}

function statusLabel(status: string) {
  return status.replace(/([a-z])([A-Z])/gu, "$1 $2").toLowerCase();
}

const RUN_ITEM_LIMIT = 5;

export function ApprovalCard({
  approval,
  onDecide
}: {
  approval: Approval;
  onDecide: (decision: Decision) => Promise<void>;
}) {
  return (
    <div className="approval-card">
      <ShieldCheck size={18} />
      <div>
        <strong>Approval required</strong>
        <p>{approval.reason}</p>
        <code>{approval.command}</code>
        <footer>
          <button onClick={() => void onDecide("decline")} type="button">Decline</button>
          <button onClick={() => void onDecide("acceptForSession")} type="button">Allow for task</button>
          <button className="primary" onClick={() => void onDecide("accept")} type="button">Allow once</button>
        </footer>
      </div>
    </div>
  );
}

export function EnvironmentPanel({
  changes,
  changesState,
  diff,
  files,
  filesState,
  onOpenFile,
  workspace
}: {
  changes: GitChange[];
  changesState: ResourceState;
  diff: string;
  files: FileEntry[];
  filesState: ResourceState;
  onOpenFile: (path: string) => void;
  workspace: Workspace;
}) {
  return (
    <aside className="agent-environment">
      <header>Environment</header>
      <section>
        <h2><FileDiff size={15} /> Changes <b>{changes.length}</b></h2>
        {changes.slice(0, 6).map((change) => (
          <button key={change.path} onClick={() => onOpenFile(change.path)} type="button">
            <span>{change.path}</span><small>{change.status}</small>
          </button>
        ))}
        {changesState === "loading" ? <p>Refreshing source control...</p> : null}
        {changesState === "ready" && changes.length === 0 ? <p>Working tree is clean.</p> : null}
        {changesState === "unavailable" ? <p>Source control is unavailable.</p> : null}
      </section>
      <section>
        <h2><GitBranch size={15} /> Local</h2>
        <div className="environment-row"><span>Branch</span><strong>{workspace.branch}</strong></div>
        <div className="environment-row">
          <span>Root entries</span>
          <strong>{filesState === "loading" ? "Indexing" : files.length}</strong>
        </div>
      </section>
      {diff ? (
        <section><h2><Play size={15} /> Latest diff</h2><pre>{diff.slice(0, 1600)}</pre></section>
      ) : null}
    </aside>
  );
}
