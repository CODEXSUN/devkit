import {
  BotIcon,
  CalendarCheckIcon,
  CircleGaugeIcon,
  DatabaseIcon,
  FolderKanbanIcon,
  GitForkIcon,
  LayoutGridIcon,
  PaletteIcon,
  PencilRulerIcon,
  SendIcon,
  ServerCogIcon,
  WorkflowIcon
} from "lucide-react";
import type { ComponentType } from "react";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";

type AppDeskEntry = {
  description: string;
  group: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  url: string;
};

const applications: AppDeskEntry[] = [
  {
    description: "Approved VPS inspection and management through Codex MCP.",
    group: "Infrastructure",
    icon: ServerCogIcon,
    title: "Hostinger VPS",
    url: "/app/devkit/hostinger"
  },
  {
    description: "Projects, initiatives, and development workspaces.",
    group: "Development",
    icon: FolderKanbanIcon,
    title: "Projects",
    url: "/app/devkit/projects"
  },
  {
    description: "Initiative planning and delivery roadmap.",
    group: "Development",
    icon: FolderKanbanIcon,
    title: "Initiative Roadmap",
    url: "/app/devkit/roadmap"
  },
  {
    description: "Assigned work and delivery tracking.",
    group: "Development",
    icon: FolderKanbanIcon,
    title: "Tasks",
    url: "/app/devkit/tasks"
  },
  {
    description: "Engineering lifecycle and orchestration signals.",
    group: "Orchestration",
    icon: WorkflowIcon,
    title: "Command Center",
    url: "/app/devkit/orchestration"
  },
  {
    description: "Project-aware Codex chat and controlled runs.",
    group: "Agents",
    icon: BotIcon,
    title: "Project Agent",
    url: "/app/devkit/agent-ide"
  },
  {
    description: "Independent local Codex runtime connection.",
    group: "Agents",
    icon: BotIcon,
    title: "Agent Connector",
    url: "/app/devkit/launch-desk"
  },
  {
    description: "Repository knowledge for prompts and reviews.",
    group: "Agents",
    icon: BotIcon,
    title: "Skill Library",
    url: "/app/devkit/skills"
  },
  {
    description: "Visual planning boards connected to work records.",
    group: "Planning",
    icon: PencilRulerIcon,
    title: "Whiteboards",
    url: "/app/devkit/planning"
  },
  {
    description: "Current work, priorities, and daily signals.",
    group: "Development",
    icon: CalendarCheckIcon,
    title: "Today",
    url: "/app/devkit/today"
  },
  {
    description: "High-level project and delivery summary.",
    group: "Development",
    icon: CircleGaugeIcon,
    title: "Overview",
    url: "/app/devkit/overview"
  },
  {
    description: "Connect the CodeLogicX Telegram bot.",
    group: "Telegram",
    icon: SendIcon,
    title: "Connect Mobile",
    url: "/app/devkit/telegram-connect"
  },
  {
    description: "Telegram conversation and task controls.",
    group: "Telegram",
    icon: SendIcon,
    title: "Telegram Chat",
    url: "/app/devkit/telegram-chat"
  },
  {
    description: "Platform, module, and ownership registry.",
    group: "Development",
    icon: DatabaseIcon,
    title: "Platform Registry",
    url: "/app/devkit/registry"
  },
  {
    description: "Local and GitHub repository health.",
    group: "Source",
    icon: GitForkIcon,
    title: "GitHub Dashboard",
    url: "/app/devkit/github"
  },
  {
    description: "Approved GitHub and private Git sources.",
    group: "Source",
    icon: GitForkIcon,
    title: "Repository Connections",
    url: "/app/devkit/repository-settings"
  },
  {
    description: "Shared interface components and states.",
    group: "Design System",
    icon: PaletteIcon,
    title: "Components",
    url: "/app/devkit/design-system/components"
  },
  {
    description: "Reusable workspace and page compositions.",
    group: "Design System",
    icon: PaletteIcon,
    title: "Templates",
    url: "/app/devkit/design-system/templates"
  }
];

export function AppDeskWorkspace() {
  return (
    <main className="mx-auto w-full max-w-[92rem] px-6 py-7 lg:px-8">
      <header className="flex items-start gap-4 border-b pb-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <LayoutGridIcon className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">App Desk</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Existing workspaces are parked here while CodeLogicX is rebuilt. Open, review, and
            verify one workspace at a time before restoring it to navigation.
          </p>
        </div>
      </header>

      <section className="grid gap-4 py-7 sm:grid-cols-2 xl:grid-cols-3">
        {applications.map((application) => (
          <a
            key={application.url}
            className="group flex min-h-36 cursor-pointer flex-col rounded-xl border bg-card p-5 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-primary/35 hover:shadow-md"
            href={application.url}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-muted text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                <application.icon className="size-4" />
              </span>
              <WorkspaceStatusBadge label="Review" tone="warning" />
            </div>
            <div className="mt-5">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{application.title}</h2>
                <span className="text-xs text-muted-foreground">{application.group}</span>
              </div>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {application.description}
              </p>
            </div>
          </a>
        ))}
      </section>
    </main>
  );
}
