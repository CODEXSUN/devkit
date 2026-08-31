import { Trash2 } from "lucide-react";
import type { SharedTodo } from "./todo-client";

type DeleteTodoDialogProps = {
  busy: boolean;
  onCancel: () => void;
  onDelete: () => void;
  todo: SharedTodo;
};

export function DeleteTodoDialog({ busy, onCancel, onDelete, todo }: DeleteTodoDialogProps) {
  return (
    <div
      className="todo-dialog-backdrop"
      onClick={(event) => {
        if (event.currentTarget === event.target && !busy) onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !busy) onCancel();
      }}
      role="presentation"
    >
      <section
        aria-describedby="delete-todo-description"
        aria-labelledby="delete-todo-title"
        aria-modal="true"
        className="todo-delete-dialog"
        role="alertdialog"
      >
        <span>
          <Trash2 size={19} />
        </span>
        <div>
          <h2 id="delete-todo-title">Delete todo?</h2>
          <p id="delete-todo-description">
            “{todo.title}” will be removed from every connected device.
          </p>
        </div>
        <footer>
          <button autoFocus disabled={busy} onClick={onCancel} type="button">
            Cancel
          </button>
          <button disabled={busy} onClick={onDelete} type="button">
            {busy ? "Deleting…" : "Delete"}
          </button>
        </footer>
      </section>
    </div>
  );
}
