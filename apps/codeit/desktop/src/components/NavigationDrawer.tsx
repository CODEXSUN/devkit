import {
  MessageSquare,
  SlidersHorizontal,
  FolderKanban,
  Activity,
  X,
  SquareCode,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import { useTheme } from "../theme";

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: "chat" | "settings") => void;
  currentView: "chat" | "settings";
}

export function NavigationDrawer({
  isOpen,
  onClose,
  onNavigate,
  currentView,
}: NavigationDrawerProps) {
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
      />

      {/* Slide-out Left Navigation Drawer */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-card border-r border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200 select-none text-xs">
        {/* Drawer Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-primary">
            <SquareCode size={20} />
            <span>CodeIt Navigation</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5">
            Main Navigation
          </div>

          <NavItem
            icon={<MessageSquare size={16} className="text-primary" />}
            title="AI Chat IDE Workspace"
            subtitle="Main coding chat stream"
            active={currentView === "chat"}
            onClick={() => {
              onNavigate("chat");
              onClose();
            }}
          />

          <NavItem
            icon={<SlidersHorizontal size={16} className="text-amber-500" />}
            title="Agent & Model Settings"
            subtitle="Drill down parameters & API keys"
            active={currentView === "settings"}
            onClick={() => {
              onNavigate("settings");
              onClose();
            }}
          />

          <div className="w-full h-px bg-border/60 my-2" />

          {/* Theme Preference Selector */}
          <div className="space-y-2 px-1 py-1">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 flex items-center gap-1.5">
              <Sun size={12} className="text-amber-400" />
              <span>Theme Preference</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/50 border border-border rounded-lg">
              <ThemeButton
                active={theme === "light"}
                onClick={() => setTheme("light")}
                icon={<Sun size={13} />}
                label="Light"
              />
              <ThemeButton
                active={theme === "dark"}
                onClick={() => setTheme("dark")}
                icon={<Moon size={13} />}
                label="Dark"
              />
              <ThemeButton
                active={theme === "system"}
                onClick={() => setTheme("system")}
                icon={<Laptop size={13} />}
                label="System"
              />
            </div>
          </div>

          <div className="w-full h-px bg-border/60 my-2" />

          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5">
            System & Tools
          </div>

          <NavItem
            icon={<FolderKanban size={16} className="text-blue-500" />}
            title="Project Workspaces"
            subtitle="Monorepo package inventory"
            onClick={() => {
              onNavigate("chat");
              onClose();
            }}
          />

          <NavItem
            icon={<Activity size={16} className="text-emerald-500" />}
            title="System Telemetry"
            subtitle="Tauri Rust IPC & memory metrics"
            onClick={() => {
              onNavigate("settings");
              onClose();
            }}
          />
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-border bg-muted/20 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>CodeIt Security Sandbox Active</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground/70 pt-1">
            <span>Tauri 2 + React 18</span>
            <span className="flex items-center gap-1 font-mono">
              <Sparkles size={10} className="text-amber-400" /> v0.1.0
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}

function NavItem({
  icon,
  title,
  subtitle,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all group ${
        active
          ? "bg-primary/10 border-primary/40 text-foreground font-semibold shadow-xs"
          : "bg-background/40 border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-muted/60">{icon}</div>
        <div className="flex flex-col">
          <span className="font-semibold text-foreground text-xs">{title}</span>
          <span className="text-[10px] text-muted-foreground/80">{subtitle}</span>
        </div>
      </div>
      <ChevronRight size={14} className="text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function ThemeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1 py-1.5 rounded-md font-medium text-[11px] transition-all ${
        active
          ? "bg-background text-foreground shadow-xs border border-border/80 font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
