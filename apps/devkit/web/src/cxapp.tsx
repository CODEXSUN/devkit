import type { SidemenuItem } from "@codexsun/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import type { TopMenuWorkspaceItem } from "@codexsun/ui/blocks/menu/sidemenu/top-menu";
import {
  BotIcon,
  BookOpenIcon,
  BriefcaseBusinessIcon,
  CableIcon,
  CloudCogIcon,
  GitBranchIcon,
  LayoutDashboardIcon,
  LibraryBigIcon,
  RocketIcon,
  SendIcon,
  ServerCogIcon,
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
  workspace("dashboard", "Dashboard", "My Work", () =>
    import("./modules/dashboard").then((module) => ({
      default: module.DashboardWorkspace
    }))
  ),
  workspace("apps", "App Desk", "System", () =>
    import("./modules/app-desk").then((module) => ({
      default: module.AppDeskWorkspace
    }))
  ),
  workspace("docs", "Documentation", "Knowledge", () =>
    import("./modules/docs").then((module) => ({
      default: module.DocsWorkspace
    }))
  ),
  workspace("hostinger", "Hostinger VPS", "Infrastructure", () =>
    import("./modules/hostinger-mcp").then((module) => ({
      default: module.HostingerMcpWorkspace
    }))
  ),
  workspace("hostinger-details", "Hostinger details", "Infrastructure", () =>
    import("./modules/hostinger-mcp").then((module) => ({
      default: module.HostingerDetailWorkspace
    }))
  ),
  workspace("project-sync", "Local-first Sync", "Cloud", () =>
    import("./modules/sync").then((module) => ({
      default: module.ProjectSyncSettingsWorkspace
    }))
  ),
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
  workspace("honey", "Honey Chat", "Agents", () =>
    import("./modules/honey").then((module) => ({ default: module.HoneyWorkspace }))
  ),
  workspace("launch-desk", "Agent Connector", "Agents", () =>
    import("./modules/launch-desk").then((module) => ({
      default: module.LaunchDeskWorkspace
    }))
  ),
  workspace("skills", "Skill Library", "Agents", () =>
    import("./modules/skill-library").then((module) => ({
      default: module.SkillLibraryWorkspace
    }))
  ),
  workspace("my-work", "My Work", "Work", () =>
    import("./modules/work-hub").then((module) => ({
      default: module.MyWorkWorkspace
    }))
  ),
  workspace("overview", "Work Overview", "Work", () =>
    import("./modules/work-hub").then((module) => ({
      default: module.WorkOverviewWorkspace
    }))
  ),
  workspace("projects", "Projects", "Work", () =>
    Promise.all([
      import("./modules/work-automation"),
      import("./modules/work-hub"),
      import("./modules/sync")
    ]).then(([work, hub, sync]) => ({
      default: () => (
        <hub.WorkShell current="Projects">
          <div className="flex justify-end border-b px-5 py-3 lg:px-8">
            <sync.ProjectSyncButton />
          </div>
          <work.WorkAutomationWorkspace />
        </hub.WorkShell>
      )
    }))
  ),
  workspace("roadmap", "Roadmap", "Work", () =>
    import("./modules/work-hub").then((module) => ({
      default: module.ProjectScopedRoadmapWorkspace
    }))
  ),
  workspace("tasks", "Tasks", "Work", () =>
    Promise.all([import("./modules/task-manager"), import("./modules/work-hub")]).then(
      ([tasks, hub]) => ({
        default: () => (
          <hub.WorkShell current="Tasks">
            <tasks.TaskManagerWorkspace />
          </hub.WorkShell>
        )
      })
    )
  ),
  workspace("issues", "Issues", "Work", () =>
    import("./modules/work-hub").then((module) => ({
      default: () => <module.WorkSectionWorkspace section="Issues" />
    }))
  ),
  workspace("sprints", "Sprints", "Work", () =>
    import("./modules/work-hub").then((module) => ({
      default: () => <module.WorkSectionWorkspace section="Sprints" />
    }))
  ),
  workspace("releases", "Releases", "Work", () =>
    import("./modules/work-hub").then((module) => ({
      default: () => <module.WorkSectionWorkspace section="Releases" />
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
      description: "Review and open CodeLogicX workspaces.",
      icon: WrenchIcon,
      title: "App Desk",
      url: "/app/devkit/apps"
    };
  },
  githubSwitcherItem(active: boolean): TopMenuWorkspaceItem {
    return {
      active,
      description: "Repositories, pull requests, and delivery signals.",
      icon: GitBranchIcon,
      title: "GitHub",
      url: "/app/devkit/github"
    };
  },
  menuItems(activeWorkspaceId: string): SidemenuItem[] {
    return [
      {
        icon: LayoutDashboardIcon,
        isActive: activeWorkspaceId === "dashboard",
        title: "Dashboard",
        url: "/app/devkit/dashboard"
      },
      {
        icon: BriefcaseBusinessIcon,
        isActive: workWorkspaceIds.includes(activeWorkspaceId),
        items: workMenuItems.map((item) => ({
          isActive: activeWorkspaceId === item.id,
          title: item.title,
          url: `/app/devkit/${item.id}`
        })),
        title: "Work"
      },
      {
        icon: BotIcon,
        isActive: agentWorkspaceIds.includes(activeWorkspaceId),
        items: agentMenuItems.map((item) => ({
          icon: item.icon,
          isActive: activeWorkspaceId === item.id,
          title: item.title,
          url: `/app/devkit/${item.id}`
        })),
        title: "Agents"
      },
      {
        icon: GitBranchIcon,
        isActive: ["github", "repository-settings"].includes(activeWorkspaceId),
        items: [
          {
            icon: LayoutDashboardIcon,
            isActive: activeWorkspaceId === "github",
            title: "GitHub Dashboard",
            url: "/app/devkit/github"
          },
          {
            icon: CableIcon,
            isActive: activeWorkspaceId === "repository-settings",
            title: "Repository Connections",
            url: "/app/devkit/repository-settings"
          }
        ],
        title: "GitHub",
        url: "/app/devkit/github"
      },
      {
        icon: SendIcon,
        isActive: telegramWorkspaceIds.includes(activeWorkspaceId),
        items: telegramMenuItems.map((item) => ({
          isActive: activeWorkspaceId === item.id,
          title: item.title,
          url: `/app/devkit/${item.id}`
        })),
        title: "Telegram",
        url: "/app/devkit/telegram-connect"
      },
      {
        icon: RocketIcon,
        isActive: ["hostinger", "hostinger-details"].includes(activeWorkspaceId),
        items: [
          {
            icon: ServerCogIcon,
            isActive: ["hostinger", "hostinger-details"].includes(activeWorkspaceId),
            title: "Hostinger VPS",
            url: "/app/devkit/hostinger"
          }
        ],
        title: "Deployment"
      },
      {
        icon: CloudCogIcon,
        isActive: activeWorkspaceId === "project-sync",
        items: [
          {
            isActive: activeWorkspaceId === "project-sync",
            title: "Local-first Sync",
            url: "/app/devkit/project-sync"
          }
        ],
        title: "Cloud"
      },
      {
        icon: BookOpenIcon,
        isActive: activeWorkspaceId === "docs",
        title: "Documentation",
        url: "/app/devkit/docs"
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

const workMenuItems = [
  { id: "overview", title: "Overview" },
  { id: "my-work", title: "My Work" },
  { id: "projects", title: "Projects" },
  { id: "tasks", title: "Tasks" },
  { id: "issues", title: "Issues" },
  { id: "roadmap", title: "Roadmap" },
  { id: "sprints", title: "Sprints" },
  { id: "releases", title: "Releases" }
] as const;

const workWorkspaceIds: string[] = workMenuItems.map((item) => item.id);

const agentMenuItems = [
  { icon: BotIcon, id: "agent-ide", title: "Project Agent" },
  { icon: CableIcon, id: "launch-desk", title: "Agent Connector" },
  { icon: LibraryBigIcon, id: "skills", title: "Skills" }
] as const;

const agentWorkspaceIds: string[] = agentMenuItems.map((item) => item.id);

const telegramMenuItems = [
  { id: "telegram-connect", title: "Connect Mobile" },
  { id: "telegram-chat", title: "Chat" }
] as const;

const telegramWorkspaceIds: string[] = telegramMenuItems.map((item) => item.id);
