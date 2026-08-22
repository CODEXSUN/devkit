import { Archive, ClipboardCheck, MessageSquare, MoreHorizontal, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AgentTask } from "../contracts/desktop";
import { DeleteAgentChatDialog } from "./delete-agent-chat-dialog";

export function AgentChatHistory({
  activeTaskId,
  busy,
  onArchive,
  onDelete,
  onOpenTask,
  onRequestReview,
  tasks
}: {
  activeTaskId: number | undefined;
  busy: boolean;
  onArchive: (task: AgentTask) => void;
  onDelete: (task: AgentTask) => Promise<void | undefined>;
  onOpenTask: (task: AgentTask) => void;
  onRequestReview: (task: AgentTask) => void;
  tasks: AgentTask[];
}) {
  const [deletePending, setDeletePending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AgentTask>();
  const [openMenuTaskId, setOpenMenuTaskId] = useState<number>();
  const historyRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const closeMenuOnOutsideClick = (event: PointerEvent) => {
      if (historyRef.current?.contains(event.target as Node)) return;
      setOpenMenuTaskId(undefined);
    };
    const closeMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenuTaskId(undefined);
    };
    document.addEventListener("pointerdown", closeMenuOnOutsideClick);
    window.addEventListener("keydown", closeMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenuOnOutsideClick);
      window.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, []);

  async function deleteSelectedTask() {
    if (!deleteTarget) return;
    setDeletePending(true);
    try {
      await onDelete(deleteTarget);
      setDeleteTarget(undefined);
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <section className="agent-chat-history" aria-label="Project chat history" ref={historyRef}>
      <div className="history-heading">Chat history</div>
      {tasks.length === 0 ? (
        <p className="history-empty">No chats yet for this project.</p>
      ) : (
        <div className="history-list">
          {tasks.map((task) => (
            <div
              className={`history-row${task.id === activeTaskId ? " active" : ""}`}
              key={task.id}
            >
              <button
                className="history-open-task"
                disabled={busy}
                onClick={() => onOpenTask(task)}
                type="button"
              >
                <span><MessageSquare size={13} /> {task.title}</span>
                <small>{task.reviewRequested ? "Review queued" : formatHistoryTime(task.updatedAt)}</small>
              </button>
              <div className="history-task-menu">
                <button
                  aria-expanded={openMenuTaskId === task.id}
                  aria-haspopup="menu"
                  aria-label={`Chat actions for ${task.title}`}
                  className="history-task-menu-trigger"
                  disabled={busy}
                  onClick={() => setOpenMenuTaskId((current) => current === task.id ? undefined : task.id)}
                  type="button"
                >
                  <MoreHorizontal size={15} />
                </button>
                {openMenuTaskId === task.id ? <div role="menu">
                  <button disabled={busy || task.reviewRequested} onClick={() => { setOpenMenuTaskId(undefined); onRequestReview(task); }} role="menuitem" type="button">
                    <ClipboardCheck size={14} /> {task.reviewRequested ? "In review" : "Add to review"}
                  </button>
                  <button disabled={busy} onClick={() => { setOpenMenuTaskId(undefined); onArchive(task); }} role="menuitem" type="button">
                    <Archive size={14} /> Archive
                  </button>
                  <button className="danger" disabled={busy} onClick={() => { setOpenMenuTaskId(undefined); setDeleteTarget(task); }} role="menuitem" type="button">
                    <Trash2 size={14} /> Delete
                  </button>
                </div> : null}
              </div>
            </div>
          ))}
        </div>
      )}
      <DeleteAgentChatDialog
        busy={busy || deletePending}
        onClose={() => setDeleteTarget(undefined)}
        onConfirm={deleteSelectedTask}
        open={Boolean(deleteTarget)}
        task={deleteTarget}
      />
    </section>
  );
}

function formatHistoryTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Saved locally" : date.toLocaleString();
}
