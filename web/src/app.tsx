import { lazy, Suspense, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Button } from "@codexsun/ui/components/button";
import { Toaster } from "@codexsun/ui/components/sonner";

const PlatformRegistryWorkspace = lazy(async () => ({
  default: (await import("./modules/platform-registry")).PlatformRegistryWorkspace
}));
const TaskManagerWorkspace = lazy(async () => ({
  default: (await import("./modules/task-manager")).TaskManagerWorkspace
}));
const WorkAutomationWorkspace = lazy(async () => ({
  default: (await import("./modules/work-automation")).WorkAutomationWorkspace
}));

const queryClient = new QueryClient();
type Page = "projects" | "tasks" | "registry";

export function DevkitApp() {
  const [page, setPage] = useState<Page>("projects");
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur sm:flex-nowrap sm:px-5">
          <strong className="w-full text-lg sm:mr-4 sm:w-auto">CODEXSUN Devkit</strong>
          <nav aria-label="Devkit sections" className="flex min-w-0 gap-2">
            <Button
              variant={page === "projects" ? "default" : "outline"}
              onClick={() => setPage("projects")}
            >
              Projects
            </Button>
            <Button
              variant={page === "tasks" ? "default" : "outline"}
              onClick={() => setPage("tasks")}
            >
              Tasks
            </Button>
            <Button
              variant={page === "registry" ? "default" : "outline"}
              onClick={() => setPage("registry")}
            >
              Registry
            </Button>
          </nav>
        </header>
        <main className="min-w-0">
          <Suspense
            fallback={<div className="p-6 text-sm text-muted-foreground">Loading workspace...</div>}
          >
            {page === "projects" ? <WorkAutomationWorkspace /> : null}
            {page === "tasks" ? <TaskManagerWorkspace /> : null}
            {page === "registry" ? <PlatformRegistryWorkspace /> : null}
          </Suspense>
        </main>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}
