import { Hash, HelpCircle } from "lucide-react";
import {
  type KeyboardEvent,
  type RefObject,
  useState
} from "react";

type SymbolKind = "#" | "/" | "@";

type Suggestion = {
  description: string;
  label: string;
  value: string;
};

const mentions: Suggestion[] = [
  { description: "Assign or direct this message", label: "assignee", value: "@assignee" },
  { description: "Reference the message author", label: "author", value: "@author" },
  { description: "Reference a user by name", label: "user", value: "@user" },
  { description: "Notify everyone in this chat", label: "everyone", value: "@everyone" }
];

const actions: Suggestion[] = [
  { description: "Turn this message into a task", label: "todo", value: "/todo " },
  { description: "Assign the next request", label: "assign", value: "/assign " },
  { description: "Ask for a concise chat summary", label: "summarize", value: "/summarize " },
  { description: "Filter this chat by a tag", label: "filter", value: "/filter #" },
  { description: "Show every message again", label: "clear-filter", value: "/clear-filter" }
];

export function useComposerSymbols({
  inputRef,
  onChange,
  tags,
  value
}: {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  tags: string[];
  value: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const trigger = findComposerTrigger(value, inputRef.current?.selectionStart ?? value.length);
  const suggestions = composerSuggestions(trigger, tags);

  function insert(nextValue: string) {
    const textarea = inputRef.current;
    const cursor = textarea?.selectionStart ?? value.length;
    const currentTrigger = findComposerTrigger(value, cursor);
    const start = currentTrigger?.start ?? cursor;
    const next = `${value.slice(0, start)}${nextValue}${value.slice(cursor)}`;
    onChange(next);
    setSelectedIndex(0);
    window.setTimeout(() => {
      textarea?.focus();
      const position = start + nextValue.length;
      textarea?.setSelectionRange(position, position);
    }, 0);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const currentTrigger = findComposerTrigger(
      event.currentTarget.value,
      event.currentTarget.selectionStart
    );
    const currentSuggestions = composerSuggestions(currentTrigger, tags);
    if (!currentTrigger || !currentSuggestions.length) return false;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setSelectedIndex(
        (index) => (index + direction + currentSuggestions.length) % currentSuggestions.length
      );
      return true;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      insert(currentSuggestions[selectedIndex]?.value ?? currentSuggestions[0]!.value);
      return true;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onChange(`${value} `);
      return true;
    }
    return false;
  }

  return { insert, onKeyDown, selectedIndex, setSelectedIndex, suggestions, trigger };
}

export function ComposerSymbolHelp() {
  const [open, setOpen] = useState(false);
  return (
    <div className="composer-symbol-help">
      <button aria-expanded={open} aria-label="How message symbols work" onClick={() => setOpen((current) => !current)} type="button"><HelpCircle size={16} /></button>
      {open ? (
        <aside className="composer-usage" role="dialog">
          <strong>Message shortcuts</strong>
          <p><b>@</b><span>Mention an assignee, author, or user.</span></p>
          <p><b>/</b><span>Start an action such as <code>/todo</code> or <code>/summarize</code>.</span></p>
          <p><b>#</b><span>Add a reusable tag. Select a tag in chat to filter messages.</span></p>
          <small>Type a symbol, then use ↑ ↓ and Enter.</small>
        </aside>
      ) : null}
    </div>
  );
}

export function ComposerSymbolButtons({ insert }: { insert: (value: string) => void }) {
  return (
    <div className="composer-symbol-buttons" aria-label="Message shortcuts">
      {(["@", "/", "#"] as const).map((symbol) => <button aria-label={`Insert ${symbol}`} key={symbol} onClick={() => insert(symbol)} type="button">{symbol}</button>)}
    </div>
  );
}

export function ComposerSuggestions({
  onPick,
  onSelect,
  selectedIndex,
  suggestions,
  symbol
}: {
  onPick: (value: string) => void;
  onSelect: (index: number) => void;
  selectedIndex: number;
  suggestions: Suggestion[];
  symbol: SymbolKind;
}) {
  if (!suggestions.length) return null;
  return (
    <div className="composer-suggestions" role="listbox">
      <header><span>{symbol === "@" ? "Mention" : symbol === "/" ? "Action" : "Tag"}</span><small>↑ ↓ to choose · Enter to add</small></header>
      {suggestions.map((suggestion, index) => (
        <button aria-selected={index === selectedIndex} className={index === selectedIndex ? "selected" : ""} key={suggestion.value} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => onSelect(index)} onClick={() => onPick(suggestion.value)} role="option" type="button">
          <b>{symbol === "#" ? <Hash size={14} /> : symbol}{suggestion.label}</b><span>{suggestion.description}</span>
        </button>
      ))}
    </div>
  );
}

export function findComposerTrigger(value: string, cursor: number) {
  const prefix = value.slice(0, cursor);
  const match = /(^|\s)([@/#])([^\s@/#]*)$/u.exec(prefix);
  if (!match) return null;
  return { kind: match[2] as SymbolKind, query: match[3]!.toLocaleLowerCase(), start: cursor - match[2]!.length - match[3]!.length };
}

export function composerSuggestions(trigger: ReturnType<typeof findComposerTrigger>, tags: string[]) {
  if (!trigger) return [];
  const knownTags = [...new Set([...tags, "todo", "project", "decision", "blocked"])];
  const available = trigger.kind === "@" ? mentions : trigger.kind === "/" ? actions : knownTags.map((tag) => ({ description: "Filter and link related messages", label: tag, value: `#${tag} ` }));
  return available.filter((item) => item.label.toLocaleLowerCase().includes(trigger.query)).slice(0, 6);
}
