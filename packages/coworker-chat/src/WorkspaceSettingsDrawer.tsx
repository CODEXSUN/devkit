import { Archive, ArrowLeft, Search, Settings } from "lucide-react";
import { useEffect, useState } from "react";

export function WorkspaceSettingsDrawer({
  archivedChatCount,
  onClose,
  onOpenArchived,
  open
}: {
  archivedChatCount: number;
  onClose: () => void;
  onOpenArchived: () => void;
  open: boolean;
}) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);
  if (!open) return null;

  const showArchived = "archived chats".includes(query.trim().toLocaleLowerCase());
  return (
    <>
      <button
        aria-label="Close settings"
        className="workspace-settings-backdrop"
        onClick={onClose}
        type="button"
      />
      <aside aria-label="Settings" className="workspace-settings-drawer">
        <header>
          <button onClick={onClose} type="button">
            <ArrowLeft size={16} />
            <span>Back to app</span>
          </button>
          <strong><Settings size={17} /> Settings</strong>
        </header>
        <label>
          <Search size={16} />
          <input
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search settings..."
            value={query}
          />
        </label>
        <section>
          <h2>Archived</h2>
          {showArchived ? (
            <button onClick={onOpenArchived} type="button">
              <Archive size={16} />
              <span>Archived chats</span>
              {archivedChatCount ? <small>{archivedChatCount}</small> : null}
            </button>
          ) : <p>No matching settings</p>}
        </section>
      </aside>
    </>
  );
}
