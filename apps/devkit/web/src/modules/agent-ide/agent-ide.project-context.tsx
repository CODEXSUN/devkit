import { Button } from "@codexsun/ui/components/button";
import { CheckIcon, CopyIcon, FolderGit2Icon, MessageSquareTextIcon, ShieldCheckIcon } from "lucide-react";
import { useState } from "react";
import type { ProjectManagerRecord } from "../project-manager/project-manager.types";
import type { AgentIdeAccess, AgentIdeChatHistory, AgentIdeModel } from "./agent-ide.types";

export function AgentIdeProjectContext({
  access,
  conversationId,
  histories,
  model,
  onOpenHistory,
  project,
  threadId
}: {
  access: AgentIdeAccess;
  conversationId: string | null;
  histories: AgentIdeChatHistory[];
  model: AgentIdeModel;
  onOpenHistory: (uuid: string) => void;
  project?: ProjectManagerRecord;
  threadId: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const copyThread = async () => {
    if (!threadId) return;
    await navigator.clipboard.writeText(threadId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <aside className="hidden w-80 shrink-0 overflow-y-auto border-r bg-background p-5 lg:block">
      <div className="flex items-center gap-2 font-semibold">
        <FolderGit2Icon className="size-4" /> Project context
      </div>
      {project ? (
        <div className="pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {project.key}
              </p>
              <h2 className="pt-1 font-semibold leading-5">{project.title}</h2>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {project.status}
            </span>
          </div>
          <p className="pt-3 text-sm leading-6 text-muted-foreground">
            {project.description || "No project description has been added."}
          </p>
          <dl className="divide-y pt-5 text-sm">
            <ContextValue label="Module" value={project.moduleKey || "Not set"} />
            <ContextValue label="Reference type" value={project.referenceType || "Not set"} />
            <ContextValue label="Reference" value={project.referenceId || "Not set"} />
            <ContextValue label="Model" value={model} />
          </dl>
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheckIcon className="size-4 text-emerald-700 dark:text-emerald-400" />
              {accessLabel(access)}
            </div>
            <p className="pt-1 text-xs leading-5 text-muted-foreground">
              {accessDescription(access)}
            </p>
          </div>
          <div className="border-t pt-4">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <MessageSquareTextIcon className="size-4" /> Chat history
            </p>
            <div className="grid gap-1 pt-2">
              {histories.slice(0, 10).map((history) => (
                <button
                  className={`rounded-md px-2 py-2 text-left hover:bg-muted ${history.uuid === conversationId ? "bg-muted" : ""}`}
                  key={history.uuid}
                  onClick={() => onOpenHistory(history.uuid)}
                  type="button"
                >
                  <span className="line-clamp-2 text-sm leading-5">{history.title}</span>
                  <span className="block pt-1 text-xs text-muted-foreground">
                    {history.projectKey} · {formatHistoryTime(history.updatedAt)}
                  </span>
                </button>
              ))}
              {!histories.length ? (
                <p className="py-2 text-xs text-muted-foreground">Completed chats will appear here.</p>
              ) : null}
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Thread</p>
            <div className="flex items-center gap-2 pt-2">
              <code className="min-w-0 flex-1 truncate text-xs">{threadId ?? "Starts with first message"}</code>
              {threadId ? (
                <Button aria-label="Copy thread ID" onClick={() => void copyThread()} size="icon" variant="ghost">
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <p className="pt-5 text-sm text-muted-foreground">Select a project to begin.</p>
      )}
    </aside>
  );
}

function formatHistoryTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );
}

function ContextValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words pt-1">{value}</dd>
    </div>
  );
}

function accessLabel(access: AgentIdeAccess) {
  return {
    plan: "Plan mode",
    "read-only": "Read-only access",
    "ask-approval": "Ask for approval",
    "auto-approve": "Approve for me",
    "full-access": "Full access"
  }[access];
}

function accessDescription(access: AgentIdeAccess) {
  return {
    plan: "Codex inspects the workspace and returns a plan without modifying files.",
    "read-only": "Codex may inspect the workspace. Network access and file changes are denied.",
    "ask-approval": "Workspace changes are allowed. Boundary-crossing actions pause for your decision.",
    "auto-approve": "Workspace changes are allowed and eligible approvals are reviewed automatically.",
    "full-access": "Sandbox restrictions are removed. Use only for a trusted workspace and task."
  }[access];
}
