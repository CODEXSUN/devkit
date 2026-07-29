import type { SidemenuItem } from "@codexsun/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import type { TopMenuWorkspaceItem } from "@codexsun/ui/blocks/menu/sidemenu/top-menu";
import {
  CircleGaugeIcon,
  CalendarCheckIcon,
  DatabaseIcon,
  FolderKanbanIcon,
  GitForkIcon,
  PaletteIcon,
  PencilRulerIcon,
  WrenchIcon,
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
  load: () => Promise<{ default: ComponentType }>,
): DevkitWorkspaceContribution => ({
  component: lazy(load),
  group,
  id,
  title,
});

const workspaces = Object.freeze([
  workspace("today", "Today", "Development", () =>
    import("./modules/today").then((module) => ({
      default: module.TodayWorkspace,
    })),
  ),
  workspace("overview", "Overview", "Development", () =>
    import("./modules/project-manager").then((module) => ({
      default: () => (
        <module.ProjectManagerOverview
          onOpenProject={() => window.location.assign("/app/devkit/projects")}
        />
      ),
    })),
  ),
  workspace("projects", "Projects", "Development", () =>
    import("./modules/work-automation").then((module) => ({
      default: module.WorkAutomationWorkspace,
    })),
  ),
  workspace("roadmap", "Issue Roadmap", "Development", () =>
    import("./modules/work-automation").then((module) => ({
      default: () => <module.WorkAutomationWorkspace initialView="roadmap" />,
    })),
  ),
  workspace("tasks", "Tasks", "Development", () =>
    import("./modules/task-manager").then((module) => ({
      default: module.TaskManagerWorkspace,
    })),
  ),
  workspace("registry", "Platform Registry", "Development", () =>
    import("./modules/platform-registry").then((module) => ({
      default: module.PlatformRegistryWorkspace,
    })),
  ),
  workspace("planning", "Whiteboards", "Planning", () =>
    import("./modules/planning").then((module) => ({
      default: module.PlanningWorkspace,
    })),
  ),
  workspace("github", "GitHub Dashboard", "GitHub", () =>
    import("./modules/github-dashboard").then((module) => ({
      default: module.GithubDashboardWorkspace,
    })),
  ),
  workspace("design-system-components", "Components", "Design System", () =>
    import("./modules/design-system").then((module) => ({
      default: module.DesignSystemComponentsWorkspace,
    })),
  ),
  workspace("design-system-templates", "Templates", "Design System", () =>
    import("./modules/design-system").then((module) => ({
      default: module.DesignSystemTemplatesWorkspace,
    })),
  ),
]);

export const devkitWebBundle = Object.freeze({
  id: "devkit",
  rootPath: "/app/devkit",
  title: "DevKit",
  version: "1.0.54",
  workspaces,
  applicationSwitcherItem(active: boolean): TopMenuWorkspaceItem {
    return {
      active,
      description: "Developer planning, tasks, registry, and automation.",
      icon: WrenchIcon,
      title: "DevKit",
      url: "/app/devkit",
    };
  },
  menuItems(activeWorkspaceId: string): SidemenuItem[] {
    return [
      {
        icon: PencilRulerIcon,
        isActive: activeWorkspaceId === "planning",
        title: "Planning",
        url: "/app/devkit/planning",
      },
      {
        icon: CalendarCheckIcon,
        isActive: activeWorkspaceId === "today",
        title: "Today",
        url: "/app/devkit/today",
      },
      {
        icon: CircleGaugeIcon,
        isActive: activeWorkspaceId === "overview",
        title: "Overview",
        url: "/app/devkit/overview",
      },
      {
        icon: FolderKanbanIcon,
        isActive:
          activeWorkspaceId === "projects" || activeWorkspaceId === "tasks",
        items: [
          {
            isActive: activeWorkspaceId === "projects",
            title: "Projects",
            url: "/app/devkit/projects",
          },
          {
            isActive: activeWorkspaceId === "tasks",
            title: "Tasks",
            url: "/app/devkit/tasks",
          },
        ],
        title: "Development",
        url: "/app/devkit/projects",
      },
      {
        icon: DatabaseIcon,
        isActive: activeWorkspaceId === "registry",
        title: "Platform Registry",
        url: "/app/devkit/registry",
      },
      {
        icon: GitForkIcon,
        isActive: activeWorkspaceId === "github",
        items: [
          {
            isActive: activeWorkspaceId === "github",
            title: "Projects",
            url: "/app/devkit/github",
          },
        ],
        title: "GitHub",
        url: "/app/devkit/github",
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
            url: "/app/devkit/design-system/components",
          },
          {
            isActive: activeWorkspaceId === "design-system-templates",
            title: "Templates",
            url: "/app/devkit/design-system/templates",
          },
        ],
        title: "Design System",
        url: "/app/devkit/design-system/components",
      },
    ];
  },
  resolveWorkspace(pathname: string): DevkitWorkspaceContribution | undefined {
    const [surface, packageId, section = "overview", page] = pathname
      .split("/")
      .filter(Boolean);
    if (surface !== "app" || packageId !== "devkit") return undefined;
    const workspaceId =
      section === "design-system" && page ? `design-system-${page}` : section;
    return workspaces.find((entry) => entry.id === workspaceId);
  },
});
