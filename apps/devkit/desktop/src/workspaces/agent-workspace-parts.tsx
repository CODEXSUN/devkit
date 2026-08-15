import {
  Bot,
  Code2,
  FileDiff,
  GitBranch,
  Play,
  ShieldCheck,
  TerminalSquare
} from "lucide-react";
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
  return (
    <div className="run-timeline">
      {items.map((item) => (
        <div key={item.id}>
          {item.type === "commandExecution" ? <TerminalSquare size={14} /> : <Code2 size={14} />}
          <span>{item.label}</span>
          <small>{item.status}</small>
        </div>
      ))}
    </div>
  );
}

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
          <span>Files indexed</span>
          <strong>{filesState === "loading" ? "Indexing" : files.length}</strong>
        </div>
      </section>
      {diff ? (
        <section><h2><Play size={15} /> Latest diff</h2><pre>{diff.slice(0, 1600)}</pre></section>
      ) : null}
    </aside>
  );
}
