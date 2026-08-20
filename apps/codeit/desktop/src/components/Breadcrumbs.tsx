import { ChevronRight, Folder, Terminal, Sparkles, FileCode } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  icon?: "folder" | "terminal" | "sparkles" | "file";
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium px-2 py-1 bg-background/50 rounded-md border border-border/40">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={index} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight size={12} className="text-muted-foreground/60" />}
            <button
              type="button"
              onClick={item.onClick}
              disabled={!item.onClick}
              className={`flex items-center gap-1.5 transition-colors ${
                isLast
                  ? "text-foreground font-semibold"
                  : item.onClick
                  ? "hover:text-foreground cursor-pointer"
                  : "text-muted-foreground cursor-default"
              }`}
            >
              {renderIcon(item.icon)}
              <span>{item.label}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}

function renderIcon(icon?: string) {
  switch (icon) {
    case "folder":
      return <Folder size={13} className="text-blue-500" />;
    case "terminal":
      return <Terminal size={13} className="text-emerald-500" />;
    case "sparkles":
      return <Sparkles size={13} className="text-amber-500" />;
    case "file":
      return <FileCode size={13} className="text-purple-500" />;
    default:
      return null;
  }
}
