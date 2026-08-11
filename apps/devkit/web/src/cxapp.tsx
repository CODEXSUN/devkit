import type { SidemenuItem } from "@codexsun/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import type { TopMenuWorkspaceItem } from "@codexsun/ui/blocks/menu/sidemenu/top-menu";
import {
  BotIcon,
  CircleGaugeIcon,
  CalendarCheckIcon,
  DatabaseIcon,
  FolderKanbanIcon,
  GitForkIcon,
  PaletteIcon,
  PencilRulerIcon,
  SendIcon,
  WorkflowIcon,
  WrenchIcon
} from "lucide-react";
import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export type DevkitWorkspaceContribution = {
  component: LazyExoticComponent<ComponentType>;
  group: string;
  id: string;
  title: string;
};

const workspace = (
  id: string,
  title: string,
  group: string,
  load: () => Promise<{ default: ComponentType }>
): DevkitWorkspaceContribution => ({
  component: lazy(load),
  group,
  id,
  title
});

const workspaces = Object.freeze([
  workspace("orchestration", "Engineering Command Center", "Orchestration", () =>
    import("./modules/orchestration").then((module) => ({
      default: module.OrchestrationWorkspace
    }))
  ),
  workspace("agent-ide", "Project Agent", "Agents", () =>
    import("./modules/agent-ide").then((module) => ({
      default: module.AgentIdeWorkspace
    }))
  ),
  workspace("launch-desk", "Codex Runtime", "Agents", () =>
    import("./modules/launch-desk").then((module) => ({
      default: module.LaunchDeskWorkspace
    }))
  ),
  workspace("skills", "Skill Library", "Agents", () =>
    import("./modules/skill-library").then((module) => ({
      default: module.SkillLibraryWorkspace
    }))
  ),
  workspace("today", "Today", "Development", () =>
    import("./modules/today").then((module) => ({
      default: module.TodayWorkspace
    }))
  ),
  workspace("overview", "Overview", "Development", () =>
    import("./modules/project-manager").then((module) => ({
      default: () => (
        <module.ProjectManagerOverview
          onOpenProject={() => window.location.assign("/app/devkit/projects")}
        />
      )
    }))
  ),
  workspace("projects", "Projects", "Development", () =>
    import("./modules/work-automation").then((module) => ({
      default: module.WorkAutomationWorkspace
    }))
  ),
  workspace("roadmap", "Initiative Roadmap", "Development", () =>
    import("./modules/work-automation").then((module) => ({
      default: () => <module.WorkAutomationWorkspace initialView="roadmap" />
    }))
  ),
  workspace("tasks", "Tasks", "Development", () =>
    import("./modules/task-manager").then((module) => ({
      default: module.TaskManagerWorkspace
    }))
  ),
  workspace("telegram-connect", "Connect Telegram", "Telegram", () =>
    import("./modules/telegram-support").then((module) => ({
      default: module.TelegramConnectWorkspace
    }))
  ),
  workspace("telegram-chat", "Telegram Chat", "Telegram", () =>
    import("./modules/telegram-support").then((module) => ({
      default: module.TelegramChatWorkspace
    }))
  ),
  workspace("registry", "Platform Registry", "Development", () =>
    import("./modules/platform-registry").then((module) => ({
      default: module.PlatformRegistryWorkspace
    }))
  ),
  workspace("planning", "Whiteboards", "Planning", () =>
    import("./modules/planning").then((module) => ({
      default: module.PlanningWorkspace
    }))
  ),
  workspace("github", "GitHub Dashboard", "GitHub", () =>
    import("./modules/github-dashboard").then((module) => ({
      default: module.GithubDashboardWorkspace
    }))
  ),
  workspace("repository-settings", "Repository Connections", "GitHub", () =>
    import("./modules/repository-settings").then((module) => ({
      default: module.RepositorySettingsWorkspace
    }))
  ),
  workspace("design-system-components", "Components", "Design System", () =>
    import("./modules/design-system").then((module) => ({
      default: module.DesignSystemComponentsWorkspace
    }))
  ),
  workspace("design-system-templates", "Templates", "Design System", () =>
    import("./modules/design-system").then((module) => ({
      default: module.DesignSystemTemplatesWorkspace
    }))
  )
]);

export const devkitWebBundle = Object.freeze({
  id: "devkit",
  rootPath: "/app/devkit",
  title: "CodeLogicX",
  version: "1.0.22",
  workspaces,
  applicationSwitcherItem(active: boolean): TopMenuWorkspaceItem {
    return {
      active,
      description: "Developer and engineering orchestration workspace.",
      icon: WrenchIcon,
      title: "CodeLogicX",
      url: "/app/devkit/orchestration"
    };
  },
  menuItems(activeWorkspaceId: string): SidemenuItem[] {
    return [
      {
        icon: FolderKanbanIcon,
        isActive:
          activeWorkspaceId === "projects" ||
          activeWorkspaceId === "roadmap" ||
          activeWorkspaceId === "tasks",
        items: [
          {
            isActive: activeWorkspaceId === "projects",
            title: "Projects",
            url: "/app/devkit/projects"
          },
          {
            isActive: activeWorkspaceId === "roadmap",
            title: "Initiative Roadmap",
            url: "/app/devkit/roadmap"
          },
          {
            isActive: activeWorkspaceId === "tasks",
            title: "Tasks",
            url: "/app/devkit/tasks"
          }
        ],
        title: "Development",
        url: "/app/devkit/projects"
      },
      {
        icon: WorkflowIcon,
        isActive: activeWorkspaceId === "orchestration",
        title: "Command Center",
        url: "/app/devkit/orchestration"
      },
      {
        icon: BotIcon,
        isActive:
          activeWorkspaceId === "agent-ide" ||
          activeWorkspaceId === "launch-desk" ||
          activeWorkspaceId === "skills",
        items: [
          {
            isActive: activeWorkspaceId === "agent-ide",
            title: "Project Agent",
            url: "/app/devkit/agent-ide"
          },
          {
            isActive: activeWorkspaceId === "launch-desk",
            title: "Codex Runtime",
            url: "/app/devkit/launch-desk"
          },
          {
            isActive: activeWorkspaceId === "skills",
            title: "Skill Library",
            url: "/app/devkit/skills"
          }
        ],
        title: "Agents",
        url: "/app/devkit/agent-ide"
      },
      {
        icon: PencilRulerIcon,
        isActive: activeWorkspaceId === "planning",
        title: "Planning",
        url: "/app/devkit/planning"
      },
      {
        icon: CalendarCheckIcon,
        isActive: activeWorkspaceId === "today",
        title: "Today",
        url: "/app/devkit/today"
      },
      {
        icon: CircleGaugeIcon,
        isActive: activeWorkspaceId === "overview",
        title: "Overview",
        url: "/app/devkit/overview"
      },
      {
        icon: SendIcon,
        isActive: activeWorkspaceId === "telegram-connect" || activeWorkspaceId === "telegram-chat",
        items: [
          {
            isActive: activeWorkspaceId === "telegram-connect",
            title: "Connect Mobile",
            url: "/app/devkit/telegram-connect"
          },
          {
            isActive: activeWorkspaceId === "telegram-chat",
            title: "Chat",
            url: "/app/devkit/telegram-chat"
          }
        ],
        title: "Telegram",
        url: "/app/devkit/telegram-connect"
      },
      {
        icon: DatabaseIcon,
        isActive: activeWorkspaceId === "registry",
        title: "Platform Registry",
        url: "/app/devkit/registry"
      },
      {
        icon: GitForkIcon,
        isActive: activeWorkspaceId === "github" || activeWorkspaceId === "repository-settings",
        items: [
          {
            isActive: activeWorkspaceId === "github",
            title: "Projects",
            url: "/app/devkit/github"
          },
          {
            isActive: activeWorkspaceId === "repository-settings",
            title: "Repository Connections",
            url: "/app/devkit/repository-settings"
          }
        ],
        title: "GitHub",
        url: "/app/devkit/github"
      },
      {
        icon: PaletteIcon,
        isActive:
          activeWorkspaceId === "design-system-components" ||
          activeWorkspaceId === "design-system-templates",
        items: [
          {
            isActive: activeWorkspaceId === "design-system-components",
            title: "Components",
            url: "/app/devkit/design-system/components"
          },
          {
            isActive: activeWorkspaceId === "design-system-templates",
            title: "Templates",
            url: "/app/devkit/design-system/templates"
          }
        ],
        title: "Design System",
        url: "/app/devkit/design-system/components"
      }
    ];
  },
  resolveWorkspace(pathname: string): DevkitWorkspaceContribution | undefined {
    const [surface, packageId, section = "orchestration", page] = pathname
      .split("/")
      .filter(Boolean);
    if (surface !== "app" || packageId !== "devkit") return undefined;
    const workspaceId = section === "design-system" && page ? `design-system-${page}` : section;
    return workspaces.find((entry) => entry.id === workspaceId);
  }
});
