import { useState } from "react";
import {
  MessageSquare,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
} from "lucide-react";

export interface ChatThread {
  id: string;
  title: string;
  timestamp: string;
  active?: boolean;
}

interface LeftDrawerProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeThreadId: string;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
}

const mockChatThreads: ChatThread[] = [
  { id: "1", title: "Build AI Chat IDE Layout", timestamp: "Just now", active: true },
  { id: "2", title: "Add Welcome Onboarding Screen", timestamp: "2 hours ago" },
  { id: "3", title: "Fix DevTools Auto-Open Issue", timestamp: "3 hours ago" },
  { id: "4", title: "Setup Tauri 2 IPC Handlers", timestamp: "Yesterday" },
];

export function LeftDrawer({
  collapsed,
  onToggleCollapse,
  activeThreadId,
  onSelectThread,
  onNewChat,
}: LeftDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  if (collapsed) {
    return (
      <aside className="w-12 border-r border-border bg-card/60 flex flex-col items-center py-3 gap-4 shrink-0">
        <button
          onClick={onToggleCollapse}
          title="Expand Left Drawer"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/80 active:scale-95 transition-all group"
        >
          <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" />
        </button>
        <div className="w-8 h-px bg-border my-1" />
        <button
          onClick={onNewChat}
          title="New Chat"
          className="p-2 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
        >
          <Plus size={18} />
        </button>
        <button
          onClick={onToggleCollapse}
          title="Recent Threads"
          className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <MessageSquare size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-64 border-r border-border bg-card/40 flex flex-col h-full shrink-0 select-none">
      {/* Drawer Header with New Chat Button */}
      <div className="p-3 border-b border-border flex items-center justify-between gap-2">
        <button
          onClick={onNewChat}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 active:scale-95 transition-all text-xs shadow-xs"
        >
          <Plus size={15} />
          <span>New Chat</span>
        </button>

        <button
          onClick={onToggleCollapse}
          title="Collapse Drawer"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/80 active:scale-95 transition-all group shrink-0"
        >
          <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
        </button>
      </div>

      {/* Search Input */}
      <div className="px-3 pt-3">
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/50 border border-border rounded-md text-xs text-muted-foreground">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Main Drawer Content - Recent Threads */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
            Recent Threads
          </div>
          {mockChatThreads
            .filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((thread) => {
              const isActive = thread.id === activeThreadId;
              return (
                <button
                  key={thread.id}
                  onClick={() => onSelectThread(thread.id)}
                  className={`w-full text-left p-2.5 rounded-lg flex flex-col gap-1 transition-all ${
                    isActive
                      ? "bg-primary/10 border border-primary/20 text-foreground font-medium shadow-xs"
                      : "hover:bg-accent/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="truncate flex-1 pr-2">{thread.title}</span>
                    {isActive && <CheckCircle2 size={13} className="text-primary shrink-0" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground/70">{thread.timestamp}</span>
                </button>
              );
            })}
        </div>
      </div>

    </aside>
  );
}
