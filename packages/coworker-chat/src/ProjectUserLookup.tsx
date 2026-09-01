import { Check, LoaderCircle, X } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import type { CoworkerClient } from "./client";
import type { CoworkerIdentityContact } from "./types";

export function ProjectUserLookup({ client, onChange, value }: {
  client: CoworkerClient;
  onChange: (value: string[]) => void;
  value: string[];
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [contacts, setContacts] = useState<CoworkerIdentityContact[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true);
    void client.identityContacts().then((result) => {
      if (current) setContacts(result);
    }).catch((reason: unknown) => {
      if (current) setError(reason instanceof Error ? reason.message : "Users could not be loaded.");
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => { current = false; };
  }, [client]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, []);

  const selected = useMemo(() => new Set(value.map(normalize)), [value]);
  const matches = useMemo(() => {
    const term = normalize(query);
    return contacts
      .filter((contact) => !selected.has(normalize(contact.email)) && !selected.has(normalize(contact.uuid)))
      .filter((contact) => !term || `${contact.name} ${contact.email}`.toLocaleLowerCase().includes(term))
      .slice(0, 8);
  }, [contacts, query, selected]);

  function add(contact: CoworkerIdentityContact) {
    onChange([...value, contact.email]);
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
  }

  function remove(entry: string) {
    onChange(value.filter((candidate) => candidate !== entry));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && matches.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % matches.length);
    } else if (event.key === "ArrowUp" && matches.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index - 1 + matches.length) % matches.length);
    } else if (event.key === "Enter" && open && matches[activeIndex]) {
      event.preventDefault();
      add(matches[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Backspace" && !query && value.length) {
      remove(value[value.length - 1]!);
    }
  }

  return (
    <div className="project-user-field" ref={rootRef}>
      <span className="project-user-label" id={`${listId}-label`}>Associated users</span>
      <div className="project-user-control" onClick={() => setOpen(true)}>
        {value.map((entry) => {
          const contact = contacts.find((candidate) => normalize(candidate.email) === normalize(entry) || normalize(candidate.uuid) === normalize(entry));
          return (
            <span className="project-user-chip" key={entry} title={contact?.email || entry}>
              <span>{contact?.name || entry}</span>
              <button aria-label={`Remove ${contact?.name || entry}`} onClick={(event) => { event.stopPropagation(); remove(entry); }} type="button"><X size={12} /></button>
            </span>
          );
        })}
        <input
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          aria-labelledby={`${listId}-label`}
          autoComplete="off"
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length ? "Add another user…" : "Search users by name or email…"}
          role="combobox"
          value={query}
        />
      </div>
      {open ? (
        <div className="project-user-options" id={listId} role="listbox">
          {loading ? <p><LoaderCircle className="project-user-spinner" size={15} /> Loading users…</p> : null}
          {!loading && error ? <p className="project-user-error">{error}</p> : null}
          {!loading && !error && !matches.length ? <p>{query ? "No matching users." : "All available users are selected."}</p> : null}
          {matches.map((contact, index) => (
            <button
              aria-selected={index === activeIndex}
              className={index === activeIndex ? "active" : ""}
              key={contact.uuid}
              onClick={() => add(contact)}
              onPointerEnter={() => setActiveIndex(index)}
              role="option"
              type="button"
            >
              <span><strong>{contact.name}</strong><small>{contact.email}</small></span><Check size={15} />
            </button>
          ))}
        </div>
      ) : null}
      <small>Selected users can see and act on this project and its notes.</small>
    </div>
  );
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}
