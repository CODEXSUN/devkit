import { BoxesIcon, CircleIcon } from "lucide-react";
import type { HostingerProject } from "./hostinger-mcp.types";

export function HostingerContainerList({ projects }: { projects: HostingerProject[] }) {
  return (
    <section className="border-t pt-7">
      <div className="flex items-end justify-between gap-4 pb-4">
        <div>
          <h2 className="text-lg font-semibold">Docker containers</h2>
          <p className="pt-1 text-sm text-muted-foreground">
            Compose projects reported by the Hostinger VPS API.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {projects.reduce((total, project) => total + project.containers.length, 0)} containers
        </span>
      </div>
      <div className="space-y-4">
        {projects.map((project) => (
          <article className="overflow-hidden rounded-xl border bg-card" key={project.name}>
            <header className="flex items-center justify-between gap-4 border-b bg-muted/25 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <BoxesIcon className="size-4 shrink-0 text-primary" />
                <h3 className="truncate font-semibold">{project.name}</h3>
              </div>
              <span className="text-xs text-muted-foreground">{project.status}</span>
            </header>
            <div className="divide-y">
              {project.containers.map((container) => (
                <div
                  className={`grid gap-3 border-l-2 px-4 py-4 md:grid-cols-[minmax(12rem,1.4fr)_minmax(12rem,1.2fr)_7rem_minmax(12rem,1fr)] md:items-center ${
                    needsAttention(container)
                      ? "border-l-amber-500 bg-amber-50/70"
                      : "border-l-transparent"
                  }`}
                  key={container.id}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CircleIcon
                        className={`size-2.5 shrink-0 fill-current ${healthColor(container.health)}`}
                      />
                      <span className="truncate text-sm font-medium">{container.name}</span>
                    </div>
                    <span className="block truncate pl-[18px] pt-1 text-xs text-muted-foreground">
                      {container.status}
                    </span>
                    {needsAttention(container) ? (
                      <a
                        className="block pl-[18px] pt-1 text-xs font-medium text-amber-700 hover:underline"
                        href="/app/devkit/hostinger-details?view=attention"
                      >
                        Needs attention
                      </a>
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate text-sm">{container.image}</span>
                    <span className="text-xs text-muted-foreground">Image</span>
                  </div>
                  <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    {container.version}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {container.ports.length ? (
                      container.ports.map((port) => (
                        <span className="rounded-md border px-2 py-1 font-mono text-xs" key={port}>
                          {port}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No published ports</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function healthColor(health: string) {
  if (health === "healthy") return "text-emerald-600";
  if (health === "not configured") return "text-slate-400";
  return "text-amber-600";
}

function needsAttention(container: HostingerProject["containers"][number]) {
  return (
    container.state !== "running" || !["", "healthy", "not configured"].includes(container.health)
  );
}
