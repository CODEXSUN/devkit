import { CalendarDays, Eye, Lock, Plus } from "lucide-react";
import type { FormEvent, RefObject } from "react";
import type { SharedTodoInput, SharedTodoLookup } from "./todo-client";
import { CategoryDropdown, PriorityDropdown, ProjectDropdown } from "./TodoOptionDropdown";
import type { CoworkerProject } from "./types";

type TodoFormProps = {
  busy: boolean;
  form: SharedTodoInput;
  lookups: SharedTodoLookup[];
  onChange: (value: Partial<SharedTodoInput>) => void;
  onSubmit: (event: FormEvent) => void;
  projects: CoworkerProject[];
  titleInputRef: RefObject<HTMLInputElement | null>;
};

export function TodoForm({
  busy,
  form,
  lookups,
  onChange,
  onSubmit,
  projects,
  titleInputRef
}: TodoFormProps) {
  return (
    <form className="messenger-todo-form" onSubmit={onSubmit}>
      <input
        aria-label="New todo"
        onChange={(event) => onChange({ title: event.target.value })}
        placeholder="Add a todo"
        ref={titleInputRef}
        value={form.title}
      />
      <PriorityDropdown
        lookups={lookups}
        onChange={(priority) => onChange({ priority })}
        value={form.priority ?? "medium"}
      />
      <CategoryDropdown
        lookups={lookups}
        onChange={(category) => onChange({ category })}
        value={form.category ?? ""}
      />
      <label className="todo-compact-control todo-date-control" title="Due date">
        <CalendarDays size={15} />
        <input
          aria-label="Due date"
          onChange={(event) => onChange({ dueDate: event.target.value })}
          type="date"
          value={form.dueDate}
        />
      </label>
      <ProjectDropdown
        onChange={(projectId) => onChange({ projectId })}
        projects={projects}
        value={form.projectId ?? ""}
      />
      <button
        aria-label={form.visibility === "public" ? "Make new todo private" : "Make new todo public"}
        className="todo-visibility-button"
        onClick={() =>
          onChange({ visibility: form.visibility === "public" ? "private" : "public" })
        }
        title={form.visibility === "public" ? "Public todo" : "Private todo"}
        type="button"
      >
        {form.visibility === "public" ? <Eye size={17} /> : <Lock size={17} />}
      </button>
      <button aria-label="Add todo" disabled={!form.title.trim() || busy} type="submit">
        <Plus size={18} />
      </button>
    </form>
  );
}
