import {
  BookOpen,
  Compass,
  History,
  MessageSquarePlus,
  PanelLeftOpen,
  Search
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { CoworkerChat } from "./types";
import { WorkspaceDrawerHeader } from "./WorkspaceDrawerHeader";

export function CoworkerDrawer({
  activeChatId,
  chats,
  onNewChat,
  onOpenChat,
  product,
  logoSrc,
  collapsed,
  onCollapsedChange
}: {
  activeChatId: string | null;
  chats: CoworkerChat[];
  onNewChat: () => void;
  onOpenChat: (chat: CoworkerChat) => void;
  product: string;
  logoSrc?: string;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const groups = useMemo(() => groupChats(chats, query), [chats, query]);

  return (
    <aside className={`coworker-drawer${collapsed ? " collapsed" : ""}`}>
      <button
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Open sidebar" : "Collapse sidebar"}
        className="coworker-rail-toggle"
        onClick={() => onCollapsedChange(!collapsed)}
        title={`${collapsed ? "Open" : "Collapse"} sidebar (Ctrl+B)`}
        type="button"
      >
        <PanelLeftOpen size={18} />
      </button>
      <WorkspaceDrawerHeader collapsed={collapsed} logoSrc={logoSrc} onCollapsedChange={onCollapsedChange} product={product} />
      <label className="coworker-search">
        <Search size={16} />
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search chats..."
          ref={searchRef}
          value={query}
        />
      </label>
      <nav aria-label="Chat history" className="coworker-history">
        {groups.length ? (
          groups.map((group) => (
            <section key={group.label}>
              <h2>{group.label}</h2>
              {group.chats.map((chat) => (
                <button
                  aria-current={chat.uuid === activeChatId ? "page" : undefined}
                  key={chat.uuid}
                  onClick={() => onOpenChat(chat)}
                  title={chat.title}
                  type="button"
                >
                  {chat.title}
                </button>
              ))}
            </section>
          ))
        ) : (
          <p>No matching conversations</p>
        )}
      </nav>
      <nav aria-label="Quick links" className="coworker-quick-links">
        <button onClick={() => searchRef.current?.focus()} type="button">
          <Compass size={17} /> Explore
        </button>
        <button onClick={() => searchRef.current?.focus()} type="button">
          <BookOpen size={17} /> Library
        </button>
        <button onClick={() => searchRef.current?.focus()} type="button">
          <History size={17} /> History
        </button>
      </nav>
      <footer>
        <button onClick={onNewChat} type="button">
          <MessageSquarePlus size={17} /> New Chat
        </button>
      </footer>
    </aside>
  );
}

type ChatGroup = { chats: CoworkerChat[]; label: string };

function groupChats(chats: CoworkerChat[], query: string): ChatGroup[] {
  const normalizedQuery = query.trim().toLowerCase();
  const groups = new Map<string, CoworkerChat[]>();
  for (const chat of chats) {
    if (normalizedQuery && !chat.title.toLowerCase().includes(normalizedQuery)) continue;
    const label = dateGroup(chat.updatedAt);
    groups.set(label, [...(groups.get(label) ?? []), chat]);
  }
  return ["Today", "Yesterday", "Previous 7 days", "Older"]
    .map((label) => ({ chats: groups.get(label) ?? [], label }))
    .filter((group) => group.chats.length);
}

function dateGroup(updatedAt: string) {
  const now = new Date();
  const date = new Date(updatedAt);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const age = Math.floor((today - day) / 86_400_000);
  if (age <= 0) return "Today";
  if (age === 1) return "Yesterday";
  if (age <= 7) return "Previous 7 days";
  return "Older";
}
