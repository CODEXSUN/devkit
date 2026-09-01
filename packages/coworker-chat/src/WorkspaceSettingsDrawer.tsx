import { Archive, ArrowLeft, Bell, Search, Settings } from "lucide-react";
import { useEffect, useState } from "react";

export function WorkspaceSettingsDrawer({
  archivedChatCount,
  notificationPermission,
  onClose,
  onEnableNotifications,
  onOpenArchived,
  open
}: {
  archivedChatCount: number;
  notificationPermission: NotificationPermission | "unsupported";
  onClose: () => void;
  onEnableNotifications: () => void;
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

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const showArchived = "archived chats".includes(normalizedQuery);
  const showNotifications = "message notifications alerts".includes(normalizedQuery);
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
          <h2>Messages</h2>
          {showNotifications ? <button disabled={notificationPermission !== "default"} onClick={onEnableNotifications} type="button"><Bell size={16} /><span>{notificationLabel(notificationPermission)}</span></button> : null}
          <h2>Archived</h2>
          {showArchived ? (
            <button onClick={onOpenArchived} type="button">
              <Archive size={16} />
              <span>Archived chats</span>
              {archivedChatCount ? <small>{archivedChatCount}</small> : null}
            </button>
          ) : !showNotifications ? <p>No matching settings</p> : null}
        </section>
      </aside>
    </>
  );
}

function notificationLabel(permission: NotificationPermission | "unsupported") {
  if (permission === "granted") return "Notifications enabled";
  if (permission === "denied") return "Notifications blocked by system";
  if (permission === "unsupported") return "Notifications unavailable";
  return "Enable message notifications";
}
