import { Blocks, FolderOpen, GitBranch, HardDrive, ShieldCheck } from "lucide-react";
import type { SystemStatus } from "../contracts/desktop";

export function SetupWorkspace({
  error,
  onOpen,
  system
}: {
  error: string | undefined;
  onOpen: (path?: string) => Promise<void>;
  system: SystemStatus | undefined;
}) {
  return (
    <main className="setup">
      <section className="setup-copy">
        <div className="setup-mark">
          <Blocks size={25} />
        </div>
        <p className="eyebrow">CodeLogicX Desktop</p>
        <h1>Your engineering workspace, on this machine.</h1>
        <p>
          Open a repository to use files, Git, terminals, Docker, Assist, tasks, and local execution
          from one IDE.
        </p>
        <button onClick={() => void onOpen()} type="button">
          <FolderOpen size={17} /> Open workspace
        </button>
        {error ? <div className="setup-error">{error}</div> : null}
      </section>
      <aside className="setup-status">
        <h2>Desktop runtime</h2>
        <Status icon={GitBranch} label="Git" value={system?.git ? "Ready" : "Checking"} />
        <Status icon={HardDrive} label="Local SQLite" value="Ready" />
        <Status icon={ShieldCheck} label="Execution policy" value="Workspace scoped" />
      </aside>
    </main>
  );
}

function Status({
  icon: Icon,
  label,
  value
}: {
  icon: typeof GitBranch;
  label: string;
  value: string;
}) {
  return (
    <div className="setup-status-row">
      <Icon size={17} />
      <span>
        <strong>{label}</strong>
        <small>{value}</small>
      </span>
    </div>
  );
}
