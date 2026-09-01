import { CoworkerChat } from "@codexsun/coworker-chat";
import {
  AgentConnectionPanel,
  MessengerChat,
  MessengerConnectionPanel,
  type MessengerConnectionState
} from "@codexsun/coworker-chat/messenger";
import "@codexsun/coworker-chat/styles.css";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Settings2Icon, ShieldCheckIcon } from "lucide-react";
import { devkitWebBundle } from "@codexsun/devkit-web";
import { honeyChatClient } from "@codexsun/devkit-web/modules/honey";
import { useNotificationCenter } from "@codexsun/devkit-web/modules/notification";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { ApplicationLayout } from "@codexsun/ui/layouts/application-layout";
import type { SidemenuItem } from "@codexsun/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import type { GlobalSearchItem } from "@codexsun/ui/blocks/menu/sidemenu/global-search";
import { AuthGate } from "../../shared/auth/AuthGate";
import { getToken, logout } from "../../shared/api/platform-api";
import {
  applicationEntryPath,
  canAccessAdministratorSettings,
  canSelectApplicationTheme
} from "./app-shell-access";
import { UserWorkspace } from "../../modules/user";
import { RoleWorkspace } from "../../modules/role";
import { PermissionWorkspace } from "../../modules/permission";
import { RolePermissionWorkspace } from "../../modules/role-permission";
import { UserProfileWorkspace } from "../../modules/user/user.profile.workspace";
import { ApplicationSettingsWorkspace } from "./application-settings.workspace";

type IdentityPage =
  | "identity.users"
  | "identity.roles"
  | "identity.permissions"
  | "identity.access"
  | "identity.profile";

type Claims = { email: string; name?: string; permissions?: string[]; role?: string };
const sameOriginApiUrl = import.meta.env.VITE_PLATFORM_API_URL.replace(/\/+$/u, "");

export function AppDesk() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return usesMessengerDesk(pathname) ? <MessengerAppDesk /> : <_LegacyAppDesk />;
}

const messengerDeskPaths = new Set([
  "/app/devkit/agent",
  "/app/devkit/chat",
  "/app/devkit/dashboard",
  "/app/devkit/docs",
  "/app/devkit/ideas",
  "/app/devkit/projects",
  "/app/devkit/settings",
  "/app/devkit/todos",
  "/app/settings"
]);

export function usesMessengerDesk(pathname: string) {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/u, "") : pathname;
  return messengerDeskPaths.has(normalizedPath);
}

function MessengerAppDesk() {
  const navigate = useNavigate();
  const token = getToken();
  const [drawerCollapsed, setDrawerCollapsed] = useState(true);
  const [connectionState, setConnectionState] = useState<MessengerConnectionState>("connecting");
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  return (
    <AuthGate>
      {token ? (
        <MessengerChat
          agentSidePanel={
            <AgentConnectionPanel agent="Codex" model="gpt-5.6-terra" state={connectionState} />
          }
          apiUrl={sameOriginApiUrl}
          clientKind="web"
          connectionHref="/app/devkit/project-sync"
          drawerCollapsed={drawerCollapsed}
          onConnectionStateChange={setConnectionState}
          onDrawerCollapsedChange={setDrawerCollapsed}
          onSignOut={async () => {
            await logout();
            await navigate({ to: "/login" });
          }}
          onToggleSidePanel={() => setSidePanelOpen((open) => !open)}
          product="DevKit"
          sidePanel={<MessengerConnectionPanel client="web" state={connectionState} />}
          sidePanelOpen={sidePanelOpen}
          token={token}
        />
      ) : (
        <CoworkerChat apiUrl={sameOriginApiUrl} />
      )}
    </AuthGate>
  );
}

/* Previous desk composition remains available while the chat-first product shell is validated. */
function _LegacyAppDesk() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const claims = readClaims();
  const notifications = useNotificationCenter();
  const administrator = canAccessAdministratorSettings(claims.role);
  const identityPage = identityPageFromPath(pathname);
  const workspace = devkitWebBundle.resolveWorkspace(pathname);
  const showingSettings = pathname === "/app/settings";
  const invalidIdentityPage = Boolean(
    identityPage && identityPage !== "identity.profile" && !administrator
  );
  const invalidPath = !workspace && !identityPage && !showingSettings;

  useEffect(() => {
    if (invalidIdentityPage || invalidPath) {
      void navigate({ replace: true, to: applicationEntryPath() });
    }
  }, [invalidIdentityPage, invalidPath, navigate]);

  useEffect(() => {
    if (pathname !== "/app/devkit/honey") {
      window.sessionStorage.setItem("devkit.honey.last-page", pathname);
    }
  }, [pathname]);

  const showingIdentity = Boolean(identityPage && !invalidIdentityPage);
  const showingGitHub = workspace?.group === "GitHub";
  const headerTitle = showingSettings
    ? "Clear cache"
    : showingIdentity
      ? identityTitle(identityPage!)
      : (workspace?.title ?? "Engineering Command Center");
  const globalSearchItems = buildGlobalSearchItems(administrator);

  return (
    <AuthGate>
      <ApplicationLayout
        brand={{
          logoAlt: "DevKit",
          logoDarkSrc: "/logo/logo-dark.svg",
          logoSrc: "/logo/logo.svg",
          subtitle: "Developer DevKit",
          title: "DevKit"
        }}
        companion={{
          chat: honeyChatClient,
          label: "Honey",
          spriteSheetUrl: "/pets/honey/spritesheet.webp"
        }}
        deskVariant="techmedia"
        globalSearchItems={globalSearchItems}
        headerTitle={headerTitle}
        menuItems={
          showingIdentity
            ? buildIdentityMenu(identityPage!, navigate, administrator)
            : buildApplicationMenu(workspace?.id ?? "", showingSettings)
        }
        onLogout={async () => {
          await logout();
          await navigate({ to: "/login" });
        }}
        notifications={notifications.items}
        onNotificationRead={notifications.markRead}
        profileHref="/app/identity/profile"
        showHomeAction={false}
        showSidebarUser={false}
        showThemeAction={canSelectApplicationTheme(claims.role)}
        subtitle={null}
        title={null}
        user={{
          email: claims.email,
          fallback: initials(claims.name ?? claims.email),
          name: claims.name ?? claims.email
        }}
        versionLabel={`v ${__APP_VERSION__}`}
        workspaceItems={[
          devkitWebBundle.applicationSwitcherItem(!showingIdentity && !showingGitHub),
          devkitWebBundle.githubSwitcherItem(showingGitHub),
          ...(administrator
            ? [
                {
                  active: showingIdentity,
                  description: "Local users, roles, and permissions.",
                  icon: ShieldCheckIcon,
                  title: "Platform",
                  url: "/app/identity/users"
                }
              ]
            : [])
        ]}
      >
        <Suspense fallback={<GlobalLoader />}>
          {showingSettings ? (
            <ApplicationSettingsWorkspace />
          ) : showingIdentity ? (
            <main className="mx-auto w-[calc(100%-2rem)] max-w-[92rem] space-y-5 py-4 lg:w-[calc(100%-3rem)] lg:py-5">
              {renderIdentityPage(identityPage!, claims.email)}
            </main>
          ) : workspace ? (
            <workspace.component />
          ) : (
            <GlobalLoader />
          )}
        </Suspense>
      </ApplicationLayout>
    </AuthGate>
  );
}

function buildApplicationMenu(activeWorkspaceId: string, showingSettings: boolean) {
  const menuItems = devkitWebBundle.menuItems(activeWorkspaceId);
  const documentation = menuItems.find((item) => item.title === "Documentation");
  const connection = menuItems.find((item) => item.title === "Connect Service");
  const settings: SidemenuItem = {
    icon: Settings2Icon,
    isActive: showingSettings,
    items: [
      {
        isActive: showingSettings,
        title: "Clear cache",
        url: "/app/settings"
      }
    ],
    title: "Settings"
  };
  const workspaceItems = menuItems.filter((item) => item !== documentation && item !== connection);
  return [
    ...workspaceItems,
    settings,
    ...(documentation ? [documentation] : []),
    ...(connection ? [connection] : [])
  ];
}

function buildGlobalSearchItems(administrator: boolean): GlobalSearchItem[] {
  const workspaces = devkitWebBundle.workspaces.map((entry) => ({
    group: entry.group,
    keywords: [entry.id, "DevKit", "workspace"],
    title: entry.title,
    url: workspaceUrl(entry.id)
  }));
  if (!administrator) return workspaces;
  return [
    ...workspaces,
    ...[
      ["Users", "users"],
      ["Roles", "roles"],
      ["Permissions", "permissions"],
      ["Access controls", "access"]
    ].map(([title, page]) => ({
      group: "Platform",
      keywords: ["identity", "security"],
      title: title!,
      url: `/app/identity/${page}`
    }))
  ];
}

function workspaceUrl(workspaceId: string) {
  if (workspaceId.startsWith("design-system-")) {
    return `/app/devkit/design-system/${workspaceId.replace("design-system-", "")}`;
  }
  return `/app/devkit/${workspaceId}`;
}

function renderIdentityPage(page: IdentityPage, actorEmail: string) {
  if (page === "identity.users") return <UserWorkspace actorEmail={actorEmail} />;
  if (page === "identity.roles") return <RoleWorkspace />;
  if (page === "identity.permissions") return <PermissionWorkspace />;
  if (page === "identity.access") return <RolePermissionWorkspace />;
  return <UserProfileWorkspace />;
}

function buildIdentityMenu(
  page: IdentityPage,
  navigate: ReturnType<typeof useNavigate>,
  administrator: boolean
): SidemenuItem[] {
  if (!administrator) return [];
  const item = (title: string, target: IdentityPage) => ({
    isActive: page === target,
    onSelect: () => void navigate({ to: `/app/${target.replaceAll(".", "/")}` }),
    title
  });
  return [
    {
      icon: ShieldCheckIcon,
      isActive: true,
      items: [
        item("Users", "identity.users"),
        item("Roles", "identity.roles"),
        item("Permissions", "identity.permissions"),
        item("Access controls", "identity.access")
      ],
      title: "Platform"
    }
  ];
}

function identityPageFromPath(pathname: string): IdentityPage | null {
  const value = pathname.replace(/^\/app\/?/u, "").replaceAll("/", ".");
  const allowed: IdentityPage[] = [
    "identity.users",
    "identity.roles",
    "identity.permissions",
    "identity.access",
    "identity.profile"
  ];
  return allowed.includes(value as IdentityPage) ? (value as IdentityPage) : null;
}

function identityTitle(page: IdentityPage) {
  return page
    .split(".")
    .at(-1)!
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readClaims(): Claims {
  const token = getToken();
  if (!token) return { email: "" };
  try {
    return JSON.parse(
      atob((token.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/"))
    ) as Claims;
  } catch {
    return { email: "" };
  }
}

function initials(value: string) {
  return value
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
