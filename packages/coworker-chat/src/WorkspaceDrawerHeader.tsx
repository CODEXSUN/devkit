import { PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";

type WorkspaceDrawerHeaderProps = {
  collapsed: boolean;
  logoSrc?: string | undefined;
  onCollapsedChange: (collapsed: boolean) => void;
  product: string;
};

export function WorkspaceDrawerHeader({ collapsed, logoSrc, onCollapsedChange, product }: WorkspaceDrawerHeaderProps) {
  return (
    <div className="workspace-drawer-header">
      <span className="workspace-drawer-logo">
        {logoSrc ? <img alt="" aria-hidden="true" src={logoSrc} /> : <Sparkles size={16} />}
      </span>
      <strong>{product}</strong>
      <button
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Open sidebar" : "Collapse sidebar"}
        onClick={() => onCollapsedChange(!collapsed)}
        title={collapsed ? "Open sidebar" : "Collapse sidebar"}
        type="button"
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>
    </div>
  );
}
