import {
  CalendarDays,
  Check,
  Eye,
  GripVertical,
  ListTodo,
  Lock,
  Pencil,
  Save,
  Trash2,
  X
} from "lucide-react";
import { type DragEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  type SharedTodo,
  type SharedTodoInput,
  type SharedTodoLookup,
  TodoClient
} from "./todo-client";
import type { CoworkerProject } from "./types";
import { DeleteTodoDialog } from "./DeleteTodoDialog";
import { TodoForm } from "./TodoForm";
import { TodoMetadata } from "./TodoMetadata";
import { dropPlacement, type DropPlacement, reorderById } from "./TodoReorder";
import {
  CategoryDropdown,
  PriorityDropdown,
  ProjectDropdown,
  StatusDropdown,
  VisibilityDropdown
} from "./TodoOptionDropdown";

const initialForm: SharedTodoInput = {
  category: "",
  dueDate: "",
  priority: "medium",
  projectId: "",
  status: "open",
  title: "",
  visibility: "private"
};
type TodoSpaceProps = {
  apiUrl: string;
  projects: CoworkerProject[];
  selectedProjectId?: string | null;
  token: string;
};

export function TodoSpace({ apiUrl, projects, selectedProjectId, token }: TodoSpaceProps) {
  const client = useMemo(() => new TodoClient(apiUrl, token), [apiUrl, token]);
  const [todos, setTodos] = useState<SharedTodo[]>([]);
  const [lookups, setLookups] = useState<SharedTodoLookup[]>([]);
  const [form, setForm] = useState<SharedTodoInput>(initialForm);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    placement: DropPlacement;
  } | null>(null);
  const [settledId, setSettledId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SharedTodo | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SharedTodoInput>(initialForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "private" | "public">("all");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const reorderRevisionRef = useRef(0);

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  useEffect(() => {
    void Promise.all([client.list(), client.lookups()])
      .then(([items, values]) => {
        setTodos(items);
        setLookups(values);
      })
      .catch((reason) => setError(messageFrom(reason)))
      .finally(() => setLoading(false));
  }, [client]);

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const todo = await client.create({ ...form, title: form.title.trim() });
      setTodos((current) => [todo, ...current]);
      setForm(initialForm);
    } catch (reason) {
      setError(messageFrom(reason));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(todo: SharedTodo) {
    try {
      const updated = await client.status(todo.id, isDone(todo) ? "open" : "completed");
      setTodos((current) => current.map((item) => (item.id === todo.id ? updated : item)));
    } catch (reason) {
      setError(messageFrom(reason));
    }
  }

  async function remove() {
    if (!pendingDelete || busy) return;
    setBusy(true);
    try {
      await client.delete(pendingDelete.id);
      setTodos((current) => current.filter((item) => item.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (reason) {
      setError(messageFrom(reason));
    } finally {
      setBusy(false);
    }
  }

  function edit(todo: SharedTodo) {
    setEditingId(todo.id);
    setEditForm({
      category: todo.category,
      dueDate: todo.dueDate,
      priority: todo.priority,
      projectId: todo.projectId,
      status: todo.status,
      title: todo.title,
      visibility: todo.visibility
    });
  }

  async function saveEdit() {
    if (!editingId || !editForm.title.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await client.update(editingId, {
        ...editForm,
        title: editForm.title.trim()
      });
      setTodos((current) => current.map((todo) => (todo.id === editingId ? updated : todo)));
      setEditingId(null);
    } catch (reason) {
      setError(messageFrom(reason));
    } finally {
      setBusy(false);
    }
  }

  async function drop(targetId: string, placement: DropPlacement) {
    if (!draggedId || draggedId === targetId) {
      clearDragState();
      return;
    }
    const previous = todos;
    const reordered = reorderById(todos, draggedId, targetId, placement);
    const revision = ++reorderRevisionRef.current;
    setTodos(reordered);
    setSettledId(draggedId);
    clearDragState();
    window.setTimeout(() => setSettledId(null), 420);
    try {
      const saved = await client.reorder(reordered.map((todo) => todo.id));
      if (reorderRevisionRef.current === revision) setTodos(saved);
    } catch (reason) {
      if (reorderRevisionRef.current === revision) {
        setTodos(previous);
        setError(messageFrom(reason));
      }
    }
  }

  function clearDragState() {
    setDraggedId(null);
    setDropTarget(null);
  }

  async function toggleVisibility(todo: SharedTodo) {
    try {
      const updated = await client.update(todo.id, {
        visibility: todo.visibility === "public" ? "private" : "public"
      });
      setTodos((current) => current.map((item) => (item.id === todo.id ? updated : item)));
    } catch (reason) {
      setError(messageFrom(reason));
    }
  }

  const projectNames = new Map(projects.map((project) => [project.id, project.title]));
  const open = todos.filter((todo) => !isDone(todo)).length;
  const visibleTodos = todos.filter(
    (todo) =>
      (!selectedProjectId || todo.projectId === selectedProjectId) &&
      (visibilityFilter === "all" || todo.visibility === visibilityFilter)
  );
  return (
    <section className="messenger-todo-space">
      <header>
        <div>
          <h1>Todos</h1>
          <p>Private by default. Publish only the items you choose.</p>
        </div>
        <div className="todo-header-tools">
          <span>{open} open</span>
          <div className="todo-visibility-filter" aria-label="Filter todos by visibility">
            {(["all", "private", "public"] as const).map((value) => (
              <button
                aria-pressed={visibilityFilter === value}
                key={value}
                onClick={() => setVisibilityFilter(value)}
                title={`Show ${value} todos`}
                type="button"
              >
                {value === "private" ? (
                  <Lock size={14} />
                ) : value === "public" ? (
                  <Eye size={14} />
                ) : (
                  <ListTodo size={14} />
                )}
                <span>{label(value)}</span>
              </button>
            ))}
          </div>
        </div>
      </header>
      <TodoForm
        busy={busy}
        form={form}
        lookups={lookups}
        onChange={(value) => setForm((current) => ({ ...current, ...value }))}
        onSubmit={create}
        projects={projects}
        titleInputRef={titleInputRef}
      />
      {error ? (
        <p className="messenger-todo-error" role="status">
          {error}
        </p>
      ) : null}
      <div className="messenger-todo-list">
        {loading ? (
          <p>Loading todos…</p>
        ) : (
          visibleTodos.map((todo) => (
            <TodoRow
              busy={busy}
              dragging={draggedId === todo.id}
              dropPlacement={
                draggedId && draggedId !== todo.id && dropTarget?.id === todo.id
                  ? dropTarget.placement
                  : null
              }
              editing={editingId === todo.id}
              editForm={editForm}
              key={todo.id}
              lookups={lookups}
              onCancelEdit={() => setEditingId(null)}
              onDelete={() => setPendingDelete(todo)}
              onDragEnd={clearDragState}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                const bounds = event.currentTarget.getBoundingClientRect();
                const placement = dropPlacement(event.clientY, bounds.top, bounds.height);
                setDropTarget((current) =>
                  current?.id === todo.id && current.placement === placement
                    ? current
                    : { id: todo.id, placement }
                );
              }}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", todo.id);
                setDraggedId(todo.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                void drop(todo.id, dropTarget?.id === todo.id ? dropTarget.placement : "before");
              }}
              onEdit={() => edit(todo)}
              onEditChange={(value) => setEditForm((current) => ({ ...current, ...value }))}
              onSave={() => void saveEdit()}
              onToggle={() => void toggle(todo)}
              onToggleVisibility={() => void toggleVisibility(todo)}
              projectName={projectNames.get(todo.projectId)}
              projects={projects}
              settled={settledId === todo.id}
              todo={todo}
            />
          ))
        )}
        {!loading && !visibleTodos.length ? (
          <div className="messenger-todo-empty">
            <ListTodo size={22} />
            <p>{todos.length ? "No matching todos." : "No todos yet."}</p>
          </div>
        ) : null}
      </div>
      {pendingDelete ? (
        <DeleteTodoDialog
          busy={busy}
          onCancel={() => setPendingDelete(null)}
          onDelete={() => void remove()}
          todo={pendingDelete}
        />
      ) : null}
    </section>
  );
}

type TodoRowProps = {
  busy: boolean;
  dragging: boolean;
  dropPlacement: DropPlacement | null;
  editing: boolean;
  editForm: SharedTodoInput;
  lookups: SharedTodoLookup[];
  onCancelEdit: () => void;
  onDelete: () => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onEdit: () => void;
  onEditChange: (value: Partial<SharedTodoInput>) => void;
  onSave: () => void;
  onToggle: () => void;
  onToggleVisibility: () => void;
  projectName: string | undefined;
  projects: CoworkerProject[];
  settled: boolean;
  todo: SharedTodo;
};
function TodoRow({
  busy,
  dragging,
  dropPlacement,
  editing,
  editForm,
  lookups,
  onCancelEdit,
  onDelete,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onEdit,
  onEditChange,
  onSave,
  onToggle,
  onToggleVisibility,
  projectName,
  projects,
  settled,
  todo
}: TodoRowProps) {
  const className = [
    isDone(todo) ? "done" : "",
    dragging ? "dragging" : "",
    dropPlacement ? `drop-target drop-${dropPlacement}` : "",
    editing ? "editing" : "",
    settled ? "settled" : ""
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <article
      className={className}
      draggable={!editing}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={onDrop}
    >
      <span className="todo-drag" title="Drag to reorder">
        <GripVertical size={16} />
      </span>
      <button
        aria-label={`${isDone(todo) ? "Reopen" : "Complete"} ${todo.title}`}
        className="todo-check"
        onClick={onToggle}
        type="button"
      >
        {isDone(todo) ? <Check size={15} /> : null}
      </button>
      <i
        className={`todo-priority ${priorityTone(editing ? (editForm.priority ?? "") : todo.priority)}`}
        title={`${label(todo.priority)} priority`}
      />
      {editing ? (
        <div className="todo-inline-edit">
          <input
            aria-label="Todo title"
            autoFocus
            onChange={(event) => onEditChange({ title: event.target.value })}
            value={editForm.title}
          />
          <PriorityDropdown
            lookups={lookups}
            onChange={(priority) => onEditChange({ priority })}
            value={editForm.priority ?? "medium"}
          />
          <CategoryDropdown
            lookups={lookups}
            onChange={(category) => onEditChange({ category })}
            value={editForm.category ?? ""}
          />
          <label
            className="todo-inline-icon-control todo-inline-date"
            title={editForm.dueDate ? `Due ${editForm.dueDate}` : "Set due date"}
          >
            <CalendarDays size={16} />
            <input
              aria-label="Due date"
              onChange={(event) => onEditChange({ dueDate: event.target.value })}
              type="date"
              value={editForm.dueDate ?? ""}
            />
          </label>
          <StatusDropdown
            lookups={lookups}
            onChange={(status) => onEditChange({ status })}
            value={editForm.status ?? "open"}
          />
          <ProjectDropdown
            onChange={(projectId) => onEditChange({ projectId })}
            projects={projects}
            value={editForm.projectId ?? ""}
          />
          <VisibilityDropdown
            onChange={(visibility) => onEditChange({ visibility })}
            value={editForm.visibility ?? "private"}
          />
        </div>
      ) : (
        <div>
          <strong>{todo.title}</strong>
          <TodoMetadata projectName={projectName} todo={todo} />
        </div>
      )}
      <span className="todo-row-actions">
        {!editing ? (
          <button
            aria-label={`${todo.visibility === "public" ? "Make private" : "Make public"}: ${todo.title}`}
            className={todo.visibility === "public" ? "is-public" : ""}
            onClick={onToggleVisibility}
            title={todo.visibility === "public" ? "Public todo" : "Private todo"}
            type="button"
          >
            {todo.visibility === "public" ? <Eye size={16} /> : <Lock size={16} />}
          </button>
        ) : null}
        {editing ? (
          <>
            <button
              aria-label={`Save ${todo.title}`}
              disabled={busy || !editForm.title.trim()}
              onClick={onSave}
              type="button"
            >
              <Save size={16} />
            </button>
            <button
              aria-label="Cancel editing"
              disabled={busy}
              onClick={onCancelEdit}
              type="button"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <button aria-label={`Edit ${todo.title}`} onClick={onEdit} type="button">
            <Pencil size={16} />
          </button>
        )}
        <button aria-label={`Delete ${todo.title}`} onClick={onDelete} type="button">
          <Trash2 size={16} />
        </button>
      </span>
    </article>
  );
}

function isDone(todo: SharedTodo) {
  return ["completed", "done"].includes(todo.status.toLocaleLowerCase());
}
function priorityTone(priority: string) {
  const value = priority.toLocaleLowerCase();
  return ["low", "medium", "high", "urgent"].includes(value) ? value : "other";
}
function label(value: string) {
  return value.replace(/[-_]/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
function messageFrom(reason: unknown) {
  return reason instanceof Error ? reason.message : "Todos could not be loaded.";
}
