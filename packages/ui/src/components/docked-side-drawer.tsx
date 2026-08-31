import type { ReactNode } from "react";
import { cn } from "../lib/utils";

type DockedSideDrawerProps = {
  children: ReactNode;
  className?: string;
  open: boolean;
};

export function DockedSideDrawer({ children, className, open }: DockedSideDrawerProps) {
  return (
    <aside
      aria-hidden={!open}
      className={cn(
        "absolute inset-y-0 left-0 z-40 w-72 overflow-y-auto border-r bg-background transition-transform duration-200 lg:sticky lg:top-0 lg:h-[calc(100vh-4rem)] lg:w-auto",
        open ? "visible translate-x-0" : "invisible pointer-events-none -translate-x-full",
        className
      )}
    >
      {children}
    </aside>
  );
}
