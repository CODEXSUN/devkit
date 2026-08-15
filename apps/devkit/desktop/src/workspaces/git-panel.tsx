import { Check, GitCommit, Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { GitChange, GitWorktree } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";

export function GitPanel({
  changes,
  onRefresh,
  workspacePath
}: {
  changes: GitChange[];
  onRefresh: () => Promise<void>;
  workspacePath: string;
}) {
  const [message, setMessage] = useState("");
  const [worktrees, setWorktrees] = useState<GitWorktree[]>([]);
  const [diff, setDiff] = useState<string>();
  const [worktreeName, setWorktreeName] = useState("");
  const [error, setError] = useState<string>();

  async function action(run: () => Promise<unknown>) {
    try {
      await run();
      setError(undefined);
      await onRefresh();
    } catch (reason) {
      setError(String(reason));
    }
  }
  return (
    <div className="git-panel">
      <div className="commit-box">
        <textarea
          aria-label="Commit message"
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Commit message"
          value={message}
        />
        <button
          disabled={!message.trim()}
          onClick={() =>
            void action(async () => {
              await desktopClient.gitCommit(message);
              setMessage("");
            })
          }
          type="button"
        >
          <GitCommit size={14} /> Commit staged
        </button>
      </div>
      {error ? <div className="panel-error">{error}</div> : null}
      <div className="tree-section">Changes {changes.length}</div>
      {changes.map((change) => (
        <div className="git-change" key={change.path}>
          <button
            className="git-path"
            onClick={() => void desktopClient.gitDiff(change.path).then(setDiff)}
            title="Inspect diff"
            type="button"
          >
            {change.path}
          </button>
          <span>{change.status}</span>
          <button
            aria-label={`Stage ${change.path}`}
            onClick={() => void action(() => desktopClient.gitStage([change.path]))}
            type="button"
          >
            <Plus size={13} />
          </button>
          <button
            aria-label={`Unstage ${change.path}`}
            onClick={() => void action(() => desktopClient.gitUnstage([change.path]))}
            type="button"
          >
            <Minus size={13} />
          </button>
        </div>
      ))}
      <button
        className="worktree-toggle"
        onClick={() => void desktopClient.gitWorktrees().then(setWorktrees)}
        type="button"
      >
        <Check size={13} /> Show worktrees
      </button>
      <form
        className="worktree-create"
        onSubmit={(event) => {
          event.preventDefault();
          if (!worktreeName.trim()) return;
          void action(async () => {
            await desktopClient.gitCreateWorktree(worktreeName);
            setWorktreeName("");
            setWorktrees(await desktopClient.gitWorktrees());
          });
        }}
      >
        <input
          aria-label="New worktree name"
          onChange={(event) => setWorktreeName(event.target.value)}
          placeholder="feature-name"
          value={worktreeName}
        />
        <button disabled={!worktreeName.trim()} type="submit">
          <Plus size={13} /> Create
        </button>
      </form>
      {worktrees.map((worktree) => (
        <div className="worktree-row" key={worktree.path}>
          <span className="worktree-title">
            <strong>{worktree.branch || "detached"}</strong>
            {worktree.path.toLowerCase() !== workspacePath.toLowerCase() ? (
              <button
                aria-label={`Remove ${worktree.branch || "detached worktree"}`}
                onClick={() =>
                  void action(async () => {
                    await desktopClient.gitRemoveWorktree(worktree.path);
                    setWorktrees(await desktopClient.gitWorktrees());
                  })
                }
                type="button"
              >
                <Trash2 size={12} />
              </button>
            ) : null}
          </span>
          <span>
            {worktree.head} - {worktree.path}
          </span>
        </div>
      ))}
      {diff !== undefined ? (
        <div className="diff-preview">
          <button onClick={() => setDiff(undefined)} type="button">
            Close diff
          </button>
          <pre>{diff || "No unstaged diff for this file."}</pre>
        </div>
      ) : null}
    </div>
  );
}
