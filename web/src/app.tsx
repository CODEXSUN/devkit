import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CircleGaugeIcon,
  DatabaseIcon,
  FolderKanbanIcon,
  ListChecksIcon,
  MapIcon,
} from "lucide-react";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { Toaster } from "@codexsun/ui/components/sonner";
import {
  DESIGN_SYSTEM_DEFAULT_STORAGE_KEY,
  DESIGN_SYSTEM_NAME,
  DESIGN_SYSTEM_VARIANT_MARKER,
  isDesignSystemVariantId,
} from "@codexsun/ui/design-system";
import { AppLayout } from "@codexsun/ui/layouts/app-layout";
import type { SidemenuItem } from "@codexsun/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import { AuthGate } from "./shared/auth/AuthGate";
import {
  logout,
  type Desk,
  type PlatformSession,
} from "./shared/auth/auth.services";
import { LoginPage } from "./public/login/LoginPage";

const PlatformRegistryWorkspace = lazy(async () => ({
  default: (await import("./modules/platform-registry"))
    .PlatformRegistryWorkspace,
}));
const ProjectManagerOverview = lazy(async () => ({
  default: (await import("./modules/project-manager")).ProjectManagerOverview,
}));
const TaskManagerWorkspace = lazy(async () => ({
  default: (await import("./modules/task-manager")).TaskManagerWorkspace,
}));
const WorkAutomationWorkspace = lazy(async () => ({
  default: (await import("./modules/work-automation")).WorkAutomationWorkspace,
}));

const queryClient = new QueryClient();
type Page = "overview" | "roadmap" | "projects" | "tasks" | "registry";

applyDesignSystemPreference();

export function DevkitApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<GlobalLoader />}>
        <DevkitRoute />
      </Suspense>
      <Toaster />
    </QueryClientProvider>
  );
}

function DevkitRoute() {
  const pathname = window.location.pathname;
  if (pathname === "/dev/login") return <LoginPage desk="dev" />;
  if (pathname.startsWith("/dev")) {
    return (
      <AuthGate desk="dev">
        {(session) => <DevkitDesk desk="dev" session={session} />}
      </AuthGate>
    );
  }

  window.location.replace(legacyDevPath(pathname));
  return <GlobalLoader />;
}

function DevkitDesk({
  desk,
  session,
}: {
  desk: Desk;
  session: PlatformSession;
}) {
  const [page, setPage] = useState<Page>(() =>
    pageFromPath(window.location.pathname),
  );

  useEffect(() => {
    const handleLocationChange = () =>
      setPage(pageFromPath(window.location.pathname));
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  useEffect(() => {
    document.title = `CODEXSUN Devkit | ${pageTitle(page)}`;
  }, [page]);

  function selectPage(nextPage: Page) {
    setPage(nextPage);
    window.history.pushState(
      { page: nextPage },
      "",
      pathForPage(desk, nextPage),
    );
  }

  function openProjectIssues(projectId: string) {
    setPage("projects");
    window.history.pushState(
      { page: "projects", projectId },
      "",
      `/dev/projects?project=${encodeURIComponent(projectId)}`,
    );
  }

  async function handleLogout() {
    await logout(desk);
    window.location.assign("/dev/login");
  }

  const menuItems = useMemo<SidemenuItem[]>(
    () => [
      {
        title: "Overview",
        icon: CircleGaugeIcon,
        isActive: page === "overview",
        onSelect: () => selectPage("overview"),
      },
      {
        title: "Development",
        icon: FolderKanbanIcon,
        isActive: page === "roadmap" || page === "projects" || page === "tasks",
        items: [
          {
            title: "Projects",
            isActive: page === "projects",
            onSelect: () => selectPage("projects"),
          },
          {
            title: "Tasks",
            isActive: page === "tasks",
            onSelect: () => selectPage("tasks"),
          },
        ],
      },
      {
        title: "Platform Registry",
        icon: DatabaseIcon,
        isActive: page === "registry",
        onSelect: () => selectPage("registry"),
      },
    ],
    [page],
  );

  const workspaceItems = [
    {
      title: "Overview",
      description: "Short status cards for every project.",
      icon: CircleGaugeIcon,
      active: page === "overview",
      onSelect: () => selectPage("overview"),
    },
    {
      title: "Projects",
      description:
        "Project, issue, task, activity, and review delivery hierarchy.",
      icon: FolderKanbanIcon,
      active: page === "projects",
      onSelect: () => selectPage("projects"),
    },
    ...(page === "roadmap"
      ? [
          {
            title: "Issue Roadmap",
            description:
              "Performance view for one issue and its linked delivery chain.",
            icon: MapIcon,
            active: true,
            onSelect: () => undefined,
          },
        ]
      : []),
    {
      title: "Tasks",
      description:
        "Developer task lists, priorities, scheduling, and follow-up.",
      icon: ListChecksIcon,
      active: page === "tasks",
      onSelect: () => selectPage("tasks"),
    },
    {
      title: "Registry",
      description: "Platform application and module registry coverage.",
      icon: DatabaseIcon,
      active: page === "registry",
      onSelect: () => selectPage("registry"),
    },
  ];
  const deskTitle = "Developer Desk";

  return (
    <AppLayout
      brand={{
        href: "/dev",
        logoAlt: "CODEXSUN",
        logoDarkSrc: "/logo/logo-dark.svg",
        logoSrc: "/logo/logo.svg",
        subtitle: "development",
        title: deskTitle,
      }}
      headerTitle={deskTitle}
      homeHref="/dev"
      menuItems={menuItems}
      onLogout={handleLogout}
      user={{
        email: session.email,
        fallback: "D",
        name: session.name || "Developer",
      }}
      userMenuItems={[]}
      versionLabel={`v ${import.meta.env.VITE_DEVKIT_VERSION}`}
      workspaceItems={workspaceItems}
    >
      <Suspense fallback={<GlobalLoader />}>
        {page === "overview" ? (
          <ProjectManagerOverview onOpenProject={openProjectIssues} />
        ) : null}
        {page === "roadmap" ? (
          <WorkAutomationWorkspace initialView="roadmap" />
        ) : null}
        {page === "projects" ? <WorkAutomationWorkspace /> : null}
        {page === "tasks" ? <TaskManagerWorkspace /> : null}
        {page === "registry" ? <PlatformRegistryWorkspace /> : null}
      </Suspense>
    </AppLayout>
  );
}

function pageFromPath(pathname: string): Page {
  if (pathname.endsWith("/roadmap")) return "roadmap";
  if (pathname.endsWith("/projects")) return "projects";
  if (pathname.endsWith("/tasks")) return "tasks";
  if (pathname.endsWith("/registry")) return "registry";
  return "overview";
}

function pathForPage(desk: Desk, page: Page) {
  void desk;
  const root = "/dev";
  if (page === "tasks") return `${root}/tasks`;
  if (page === "registry") return `${root}/registry`;
  if (page === "projects") return `${root}/projects`;
  if (page === "roadmap") return `${root}/roadmap`;
  return root;
}

function legacyDevPath(pathname: string) {
  const legacyMatch = pathname.match(/^\/(?:sa|admin)(\/.*)?$/u);
  return legacyMatch ? `/dev${legacyMatch[1] ?? ""}` : "/dev";
}

function pageTitle(page: Page) {
  if (page === "overview") return "Overview";
  if (page === "roadmap") return "Issue Roadmap";
  if (page === "projects") return "Project Manager";
  if (page === "tasks") return "Task Manager";
  if (page === "registry") return "Platform Registry";
  return "Issue Roadmap";
}

function applyDesignSystemPreference() {
  const storedVariant = window.localStorage.getItem(
    DESIGN_SYSTEM_DEFAULT_STORAGE_KEY,
  );
  document.documentElement.setAttribute(
    "data-design-system",
    DESIGN_SYSTEM_NAME,
  );
  document.documentElement.setAttribute(
    DESIGN_SYSTEM_VARIANT_MARKER,
    storedVariant && isDesignSystemVariantId(storedVariant)
      ? storedVariant
      : "default",
  );
}
