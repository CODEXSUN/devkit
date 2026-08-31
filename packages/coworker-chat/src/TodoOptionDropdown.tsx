import { Circle, Eye, Folder, Lock, Tag } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";
import type { SharedTodoLookup } from "./todo-client";
import type { CoworkerProject } from "./types";

type DropdownOption = { id: string; name: string; value: string };
type DropdownProps = {
  ariaLabel: string;
  className?: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  renderIcon: (value: string) => ReactNode;
  value: string;
};

export function PriorityDropdown({
  lookups,
  onChange,
  value
}: {
  lookups: SharedTodoLookup[];
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <TodoOptionDropdown
      ariaLabel="Priority"
      className={`priority-${priorityTone(value)}`}
      onChange={onChange}
      options={lookupOptions(lookups, "priority", ["low", "medium", "high", "urgent"])}
      renderIcon={(optionValue) => <i className={`todo-priority ${priorityTone(optionValue)}`} />}
      value={value}
    />
  );
}

export function CategoryDropdown({
  lookups,
  onChange,
  value
}: {
  lookups: SharedTodoLookup[];
  onChange: (value: string) => void;
  value: string;
}) {
  const options = [
    { id: "no-category", name: "No category", value: "" },
    ...lookupOptions(lookups, "category")
  ];
  return (
    <TodoOptionDropdown
      ariaLabel="Category"
      className="category"
      onChange={onChange}
      options={options}
      renderIcon={() => <Tag size={17} />}
      value={value}
    />
  );
}

export function ProjectDropdown({
  onChange,
  projects,
  value
}: {
  onChange: (value: string) => void;
  projects: CoworkerProject[];
  value: string;
}) {
  const options = [
    { id: "all-projects", name: "All projects", value: "" },
    ...projects.map((project) => ({ id: project.id, name: project.title, value: project.id }))
  ];
  return (
    <TodoOptionDropdown
      ariaLabel="Project"
      className="project"
      onChange={onChange}
      options={options}
      renderIcon={() => <Folder size={17} />}
      value={value}
    />
  );
}

export function StatusDropdown({
  lookups,
  onChange,
  value
}: {
  lookups: SharedTodoLookup[];
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <TodoOptionDropdown
      ariaLabel="Status"
      className={`status status-${statusTone(value)}`}
      onChange={onChange}
      options={lookupOptions(lookups, "status", ["open", "in-progress", "blocked", "completed"])}
      renderIcon={(optionValue) => (
        <Circle className={`todo-status-icon status-${statusTone(optionValue)}`} size={15} />
      )}
      value={value}
    />
  );
}

export function VisibilityDropdown({
  onChange,
  value
}: {
  onChange: (value: "private" | "public") => void;
  value: "private" | "public";
}) {
  return (
    <TodoOptionDropdown
      ariaLabel="Visibility"
      className={`visibility ${value}`}
      onChange={(next) => onChange(next === "public" ? "public" : "private")}
      options={[
        { id: "private", name: "Private", value: "private" },
        { id: "public", name: "Public", value: "public" }
      ]}
      renderIcon={(optionValue) =>
        optionValue === "public" ? <Eye size={16} /> : <Lock size={16} />
      }
      value={value}
    />
  );
}

export function TodoOptionDropdown({
  ariaLabel,
  className,
  onChange,
  options,
  renderIcon,
  value
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | globalThis.KeyboardEvent) => {
      if (event instanceof globalThis.KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof MouseEvent && rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      if (event instanceof globalThis.KeyboardEvent) triggerRef.current?.focus();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  function openMenu(index = selectedIndex) {
    setOpen(true);
    window.requestAnimationFrame(() => optionRefs.current[index]?.focus());
  }

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = nextOptionIndex(event.key, index, options.length);
    if (next === null) return;
    event.preventDefault();
    optionRefs.current[next]?.focus();
  }

  return (
    <div className={`todo-option-dropdown ${className ?? ""}`} ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${ariaLabel}: ${selected?.name ?? "Not selected"}. Change ${ariaLabel.toLowerCase()}`}
        className="todo-option-trigger"
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
            event.preventDefault();
            openMenu(event.key === "ArrowUp" ? options.length - 1 : selectedIndex);
          }
        }}
        ref={triggerRef}
        title={`${ariaLabel}: ${selected?.name ?? "Not selected"}`}
        type="button"
      >
        {renderIcon(value)}
      </button>
      <div aria-hidden={!open} aria-label={ariaLabel} className="todo-option-menu" role="listbox">
        {options.map((option, index) => (
          <button
            aria-selected={option.value === value}
            key={option.id}
            onClick={() => {
              onChange(option.value);
              setOpen(false);
              triggerRef.current?.focus();
            }}
            onKeyDown={(event) => moveFocus(event, index)}
            ref={(element) => {
              optionRefs.current[index] = element;
            }}
            role="option"
            tabIndex={open && index === selectedIndex ? 0 : -1}
            type="button"
          >
            {renderIcon(option.value)}
            <span>{option.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function nextOptionIndex(key: string, index: number, length: number) {
  if (!length) return null;
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  if (key === "ArrowDown") return (index + 1) % length;
  if (key === "ArrowUp") return (index - 1 + length) % length;
  return null;
}

function lookupOptions(
  lookups: SharedTodoLookup[],
  kind: SharedTodoLookup["kind"],
  fallback: string[] = []
) {
  const values = lookups.filter((item) => item.kind === kind);
  return values.length
    ? values
    : fallback.map((value) => ({ id: value, name: label(value), value }));
}

function priorityTone(priority: string) {
  const value = priority.toLocaleLowerCase();
  return ["low", "medium", "high", "urgent"].includes(value) ? value : "other";
}

function statusTone(status: string) {
  const value = status.toLocaleLowerCase();
  if (["completed", "done"].includes(value)) return "completed";
  if (["blocked", "cancelled", "canceled"].includes(value)) return "blocked";
  if (["in-progress", "in progress", "started"].includes(value)) return "in-progress";
  return value === "open" ? "open" : "other";
}

function label(value: string) {
  return value.replace(/[-_]/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
