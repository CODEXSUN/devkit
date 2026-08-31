import {
  Archive,
  Bot,
  Folder,
  ListTodo,
  MessageCircle,
  PanelLeft,
  Search,
  Settings,
  User,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type WorkspaceSearchItem = {
  detail: string;
  group: "Commands" | "Conversations" | "Projects";
  id: string;
  keywords?: string;
  kind: "agent" | "archive" | "contact" | "panel" | "project" | "settings" | "todo";
  label: string;
  run: () => void;
};

type Props = {
  items: WorkspaceSearchItem[];
  onClose: () => void;
  open: boolean;
};

const historyKey = "devkit.workspace-search.history";

export function WorkspaceSearchPalette({ items, onClose, open }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [history, setHistory] = useState<string[]>(readHistory);
  const results = useMemo(() => matchItems(items, query, history), [history, items, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => setSelected(0), [query]);

  if (!open) return null;

  const choose = (item: WorkspaceSearchItem) => {
    const nextHistory = [item.id, ...history.filter((id) => id !== item.id)].slice(0, 8);
    setHistory(nextHistory);
    window.localStorage.setItem(historyKey, JSON.stringify(nextHistory));
    item.run();
    onClose();
  };

  return createPortal(
    <div
      className="workspace-search-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-label="Global workspace search"
        aria-modal="true"
        className="workspace-search-palette"
        role="dialog"
      >
        <header>
          <Search aria-hidden="true" size={18} />
          <input
            aria-activedescendant={
              results[selected] ? `workspace-search-${results[selected].id}` : undefined
            }
            aria-controls="workspace-search-results"
            aria-label="Search projects, conversations, and commands"
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelected((value) => Math.min(value + 1, results.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelected((value) => Math.max(value - 1, 0));
              } else if (event.key === "Enter" && results[selected]) {
                event.preventDefault();
                choose(results[selected]);
              } else if (event.key === "Escape") {
                event.preventDefault();
                onClose();
              }
            }}
            placeholder="Search projects, chats, people, or commands..."
            ref={inputRef}
            role="combobox"
            value={query}
          />
          <button aria-label="Close search" onClick={onClose} type="button">
            <X size={15} />
          </button>
        </header>
        <div className="workspace-search-results" id="workspace-search-results" role="listbox">
          {groupResults(results, query).map(([group, groupItems]) => (
            <section key={group}>
              <h2>{group}</h2>
              {groupItems.map((item) => {
                const index = results.indexOf(item);
                return (
                  <button
                    aria-selected={index === selected}
                    id={`workspace-search-${item.id}`}
                    key={item.id}
                    onClick={() => choose(item)}
                    onMouseEnter={() => setSelected(index)}
                    role="option"
                    type="button"
                  >
                    <span>{itemIcon(item.kind)}</span>
                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </div>
                    <kbd>↵</kbd>
                  </button>
                );
              })}
            </section>
          ))}
          {!results.length ? <p>No results for “{query}”.</p> : null}
        </div>
        <footer>
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> Navigate
          </span>
          <span>
            <kbd>Enter</kbd> Open
          </span>
          <span>
            <kbd>Esc</kbd> Close
          </span>
        </footer>
      </section>
    </div>,
    document.body
  );
}

function matchItems(items: WorkspaceSearchItem[], query: string, history: string[]) {
  const normalized = query.trim().toLocaleLowerCase();
  if (normalized) {
    return items.filter((item) =>
      `${item.label} ${item.detail} ${item.keywords ?? ""}`.toLocaleLowerCase().includes(normalized)
    );
  }
  const recent = history.flatMap((id) => items.find((item) => item.id === id) ?? []);
  const commands = items.filter((item) => item.group === "Commands");
  return [...recent, ...commands.filter((item) => !recent.includes(item))];
}

function groupResults(items: WorkspaceSearchItem[], query: string) {
  const groups = new Map<string, WorkspaceSearchItem[]>();
  items.forEach((item, index) => {
    const group =
      !query.trim() && index < items.length && readHistory().includes(item.id)
        ? "Recent"
        : item.group;
    groups.set(group, [...(groups.get(group) ?? []), item]);
  });
  return [...groups.entries()];
}

function readHistory(): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(historyKey) ?? "[]") as unknown;
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function itemIcon(kind: WorkspaceSearchItem["kind"]) {
  if (kind === "agent") return <Bot size={16} />;
  if (kind === "archive") return <Archive size={16} />;
  if (kind === "contact") return <User size={16} />;
  if (kind === "panel") return <PanelLeft size={16} />;
  if (kind === "project") return <Folder size={16} />;
  if (kind === "settings") return <Settings size={16} />;
  if (kind === "todo") return <ListTodo size={16} />;
  return <MessageCircle size={16} />;
}
