import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@codexsun/ui";
export function TradesFormBanner({ children, title, tone = "error" }: { children: ReactNode; title: string; tone?: "error" | "info" | "warning" }) {
  const Icon = tone === "warning" ? AlertTriangle : tone === "info" ? Info : AlertCircle;
  return <div className={cn("mb-4 flex gap-3 rounded-md border px-3 py-2.5 text-sm", tone === "error" && "border-destructive/30 bg-destructive/10 text-destructive", tone === "warning" && "border-amber-300 bg-amber-50 text-amber-900", tone === "info" && "border-sky-300 bg-sky-50 text-sky-900")} role={tone === "error" ? "alert" : "status"}><Icon className="mt-0.5 size-4 shrink-0" /><div className="min-w-0"><p className="font-medium">{title}</p><div className="mt-0.5 text-current/80">{children}</div></div></div>;
}
