import {
  ChevronRight,
  ChevronLeft,
  Cpu,
  ShieldCheck,
  Sparkles,
  Layers,
  Activity,
  SlidersHorizontal,
} from "lucide-react";

interface RightDrawerProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeFile: string;
  onOpenSettings?: () => void;
}

export function RightDrawer({
  collapsed,
  onToggleCollapse,
  activeFile,
  onOpenSettings,
}: RightDrawerProps) {

  if (collapsed) {
    return (
      <aside className="w-12 border-l border-border bg-card/60 flex flex-col items-center py-3 gap-4 shrink-0">
        <button
          onClick={onToggleCollapse}
          title="Expand Inspector Drawer"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/80 active:scale-95 transition-all group"
        >
          <ChevronLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
        </button>
        <div className="w-8 h-px bg-border my-1" />
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            title="Agent & Model Settings"
            className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"
          >
            <SlidersHorizontal size={18} />
          </button>
        )}
        <button
          onClick={onToggleCollapse}
          title="AI Model"
          className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Sparkles size={18} className="text-amber-400" />
        </button>
        <button
          onClick={onToggleCollapse}
          title="Telemetry"
          className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Cpu size={18} className="text-blue-400" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-72 border-l border-border bg-card/40 flex flex-col h-full shrink-0 select-none">
      {/* Drawer Header with Chevron on the Left */}
      <div className="p-3 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCollapse}
            title="Collapse Inspector Drawer"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/80 active:scale-95 transition-all group"
          >
            <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Layers size={15} className="text-primary" />
            <span>Inspector & Telemetry</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* Drill-Down Settings Entry */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="w-full p-3 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/30 flex items-center justify-between text-left transition-all active:scale-95 group shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                <SlidersHorizontal size={15} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-foreground text-xs">Agent & Model Settings</span>
                <span className="text-[10px] text-muted-foreground">Drill down parameters</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-primary transition-transform group-hover:translate-x-0.5" />
          </button>
        )}

        {/* Context Inspector */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={13} className="text-purple-400" />
            <span>Active Context File</span>
          </label>
          <div className="p-3 bg-muted/30 border border-border rounded-lg space-y-2">
            <div className="font-mono text-xs text-foreground font-medium truncate">
              {activeFile}
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
              <span>Lines: ~170</span>
              <span className="text-emerald-500 font-semibold">Attached</span>
            </div>
          </div>
        </div>

        {/* System Telemetry */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Activity size={13} className="text-blue-400" />
            <span>Tauri Runtime Status</span>
          </label>
          <div className="p-3 bg-muted/30 border border-border rounded-lg space-y-2 text-[11px]">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Backend IPC:</span>
              <span className="font-mono text-foreground font-medium">Rust Tauri 2</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>IPC Latency:</span>
              <span className="font-mono text-emerald-500 font-medium">&lt; 1ms</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Security CSP:</span>
              <span className="font-mono text-foreground font-medium">Enforced</span>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer Footer */}
      <div className="p-3 border-t border-border bg-muted/20 text-[11px] text-muted-foreground flex items-center gap-1.5">
        <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
        <span>CodeIt Security Sandbox Active</span>
      </div>
    </aside>
  );
}
