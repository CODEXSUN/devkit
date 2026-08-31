import type { SharedTodo } from "./todo-client";

export function TodoMetadata({
  todo,
  projectName
}: {
  todo: SharedTodo;
  projectName: string | undefined;
}) {
  const date = todo.dueDate ? todoDate(todo.dueDate) : null;
  return (
    <small className="todo-metadata">
      {projectName ? <span>{projectName}</span> : null}
      {todo.category ? <span>{todo.category}</span> : null}
      {date ? (
        <time dateTime={todo.dueDate} title={`Due ${date.formatted}`}>
          {date.formatted} <em>({date.relative})</em>
        </time>
      ) : null}
      <span className={`todo-status-badge ${statusTone(todo.status)}`}>{label(todo.status)}</span>
    </small>
  );
}

export function todoDate(value: string, today = new Date()) {
  const due = parseDateOnly(value);
  if (!due) return null;
  const days = Math.round((due.getTime() - startOfDay(today).getTime()) / 86_400_000);
  return {
    formatted: [pad(due.getDate()), pad(due.getMonth() + 1), due.getFullYear()].join("-"),
    relative: days === 0 ? "today" : days > 0 ? `in ${days}d` : `${Math.abs(days)}d ago`
  };
}

export function statusTone(status: string) {
  const value = status.toLocaleLowerCase();
  if (["completed", "done"].includes(value)) return "completed";
  if (["blocked", "cancelled", "canceled"].includes(value)) return "blocked";
  if (["in-progress", "in progress", "started"].includes(value)) return "in-progress";
  return value === "open" ? "open" : "other";
}

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }
  return date;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function label(value: string) {
  return value.replace(/[-_]/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
