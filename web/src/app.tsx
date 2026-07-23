import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DatabaseIcon, FolderKanbanIcon, ListChecksIcon } from "lucide-react";
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
const TaskManagerWorkspace = lazy(async () => ({
  default: (await import("./modules/task-manager")).TaskManagerWorkspace,
}));
const WorkAutomationWorkspace = lazy(async () => ({
  default: (await import("./modules/work-automation")).WorkAutomationWorkspace,
}));

const queryClient = new QueryClient();
type Page = "projects" | "tasks" | "registry";

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
  if (pathname === "/sa/login") return <LoginPage desk="sa" />;
  if (pathname === "/admin/login") return <LoginPage desk="admin" />;
  if (pathname.startsWith("/sa")) {
    return (
      <AuthGate desk="sa">
        {(session) => <DevkitDesk desk="sa" session={session} />}
      </AuthGate>
    );
  }
  if (pathname.startsWith("/admin")) {
    return (
      <AuthGate desk="admin">
        {(session) => <DevkitDesk desk="admin" session={session} />}
      </AuthGate>
    );
  }

  window.location.replace("/sa");
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

  async function handleLogout() {
    await logout(desk);
    window.location.assign(desk === "sa" ? "/sa/login" : "/admin/login");
  }

  const menuItems = useMemo<SidemenuItem[]>(
    () => [
      {
        title: "Development",
        icon: FolderKanbanIcon,
        isActive: page === "projects" || page === "tasks",
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
      title: "Projects",
      description:
        "Project planning, issues, reviews, releases, and automation.",
      icon: FolderKanbanIcon,
      active: page === "projects",
      onSelect: () => selectPage("projects"),
    },
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
  const superAdmin = desk === "sa";
  const deskTitle = superAdmin ? "Super Admin Desk" : "Staff Admin Desk";

  return (
    <AppLayout
      brand={{
        href: superAdmin ? "/sa" : "/admin",
        logoAlt: "CODEXSUN",
        logoDarkSrc: "/logo/logo-dark.svg",
        logoSrc: "/logo/logo.svg",
        subtitle: superAdmin ? "super-admin" : "staff-admin",
        title: deskTitle,
      }}
      headerTitle={deskTitle}
      homeHref={superAdmin ? "/sa" : "/admin"}
      menuItems={menuItems}
      onLogout={handleLogout}
      subtitle="Planning, task execution, platform registry, and development automation."
      title={pageTitle(page)}
      user={{
        email: session.email,
        fallback: superAdmin ? "S" : "A",
        name: session.name || (superAdmin ? "Super Admin" : "Staff Admin"),
      }}
      userMenuItems={[]}
      versionLabel={`v ${import.meta.env.VITE_DEVKIT_VERSION}`}
      workspaceItems={workspaceItems}
    >
      <Suspense fallback={<GlobalLoader />}>
        {page === "projects" ? <WorkAutomationWorkspace /> : null}
        {page === "tasks" ? <TaskManagerWorkspace /> : null}
        {page === "registry" ? <PlatformRegistryWorkspace /> : null}
      </Suspense>
    </AppLayout>
  );
}

function pageFromPath(pathname: string): Page {
  if (pathname.endsWith("/tasks")) return "tasks";
  if (pathname.endsWith("/registry")) return "registry";
  return "projects";
}

function pathForPage(desk: Desk, page: Page) {
  const root = desk === "sa" ? "/sa" : "/admin";
  if (page === "tasks") return `${root}/tasks`;
  if (page === "registry") return `${root}/registry`;
  return root;
}

function pageTitle(page: Page) {
  if (page === "tasks") return "Task Manager";
  if (page === "registry") return "Platform Registry";
  return "Project Manager";
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
