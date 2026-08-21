import {
  Download,
  FolderOpen,
  PanelBottom,
  Search,
  Settings,
  SlidersHorizontal,
  X
} from "lucide-react";
import { useEffect } from "react";
import codeItIcon from "../../src-tauri/icons/icon.png";

type Theme = "dark" | "light" | "system";

export function AppDrawer({
  onClose,
  onOpenCommands,
  onOpenSettings,
  onOpenUpdates,
  onOpenWorkspace,
  onThemeChange,
  onToggleTerminal,
  open,
  terminalOpen,
  theme
}: {
  onClose: () => void;
  onOpenCommands: () => void;
  onOpenSettings: () => void;
  onOpenUpdates: () => void;
  onOpenWorkspace: () => void;
  onThemeChange: (theme: Theme) => void;
  onToggleTerminal: () => void;
  open: boolean;
  terminalOpen: boolean;
  theme: Theme;
}) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  const actions = [
    { icon: FolderOpen, label: "Open workspace", onSelect: onOpenWorkspace },
    { icon: Search, label: "Command palette", onSelect: onOpenCommands },
    { icon: SlidersHorizontal, label: "Settings", onSelect: onOpenSettings },
    {
      icon: PanelBottom,
      label: terminalOpen ? "Hide terminal" : "Show terminal",
      onSelect: onToggleTerminal
    },
    { icon: Download, label: "Check for updates", onSelect: onOpenUpdates }
  ];

  function select(action: () => void) {
    action();
    onClose();
  }

  return (
    <div className="app-drawer-layer">
      <button
        aria-label="Close menu"
        className="app-drawer-backdrop"
        onClick={onClose}
        type="button"
      />
      <aside aria-label="DevKit menu" aria-modal="true" className="app-drawer" role="dialog">
        <header>
          <span>
            <img alt="" className="product-icon" src={codeItIcon} /> DevKit
          </span>
          <button aria-label="Close menu" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>
        <nav aria-label="Application actions">
          {actions.map((action) => (
            <button key={action.label} onClick={() => select(action.onSelect)} type="button">
              <action.icon size={18} />
              <span>{action.label}</span>
            </button>
          ))}
        </nav>
        <section className="drawer-settings">
          <h2>
            <Settings size={16} /> Settings
          </h2>
          <span>Theme</span>
          <div className="drawer-theme-options">
            {(["system", "light", "dark"] as const).map((option) => (
              <button
                aria-pressed={theme === option}
                className={theme === option ? "active" : ""}
                key={option}
                onClick={() => onThemeChange(option)}
                type="button"
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
