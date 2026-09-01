import { devkitWebBundle } from "@codexsun/devkit-web";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { SuperLayout } from "@codexsun/ui/layouts/super-layout";
import type { SidemenuItem } from "@codexsun/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import { useRouterState } from "@tanstack/react-router";
import { AppWindowIcon, BlocksIcon, CircleGaugeIcon, RefreshCwIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import { Suspense } from "react";
import { PermissionWorkspace } from "../../modules/permission";
import { RoleWorkspace } from "../../modules/role";
import { RolePermissionWorkspace } from "../../modules/role-permission";
import { UserWorkspace } from "../../modules/user";
import { UserRoleWorkspace } from "../../modules/user-role";
import { AuthGate } from "../../shared/auth/AuthGate";
import { logout } from "../../shared/api/platform-api";
import { ApplicationSettingsWorkspace } from "../app/application-settings.workspace";

type SaPage = "access" | "features" | "overview" | "permissions" | "roles" | "settings" | "updates" | "user-roles" | "users";

export function SaDesk() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const page = pageFromPath(pathname);
  const workspaceId = pathname.startsWith("/sa/devkit-") ? pathname.slice("/sa/devkit-".length) : "";
  const workspace = workspaceId ? devkitWebBundle.workspaces.find((entry) => entry.id === workspaceId) : undefined;

  return <AuthGate requireSuperAdmin><SuperLayout homeHref="/sa" menuItems={menuItems(page, workspaceId)} onLogout={handleLogout} versionLabel={`v ${__APP_VERSION__}`}>
    <Suspense fallback={<GlobalLoader className="min-h-[24rem]" fullScreen={false} />}>
      {workspace ? <workspace.component /> : <SaPageContent page={page} />}
    </Suspense>
  </SuperLayout></AuthGate>;
}

function SaPageContent({ page }: { page: SaPage }) {
  if (page === "users") return <PageFrame><UserWorkspace actorEmail={claimsEmail()} /></PageFrame>;
  if (page === "roles") return <PageFrame><RoleWorkspace /></PageFrame>;
  if (page === "permissions") return <PageFrame><PermissionWorkspace /></PageFrame>;
  if (page === "user-roles") return <PageFrame><UserRoleWorkspace /></PageFrame>;
  if (page === "access" || page === "features") return <PageFrame><RolePermissionWorkspace /></PageFrame>;
  if (page === "settings") return <ApplicationSettingsWorkspace />;
  if (page === "updates") return <UpdatesPage />;
  return <OverviewPage />;
}

function OverviewPage() {
  const cards = [
    ["Identity", "Users, roles, assignments, permissions, and feature access.", "/sa/users"],
    ["Projects", "All projects and project-owned records with unrestricted Super Admin control.", "/sa/devkit-projects"],
    ["Application features", "Every composed DevKit workspace is available through authenticated /sa routes.", "/sa/features"],
    ["Updates", "Application versions, releases, browser data, and update entry points.", "/sa/updates"]
  ];
  return <main className="mx-auto grid w-[calc(100%-2rem)] max-w-6xl gap-6 py-6 lg:w-[calc(100%-3rem)]"><header><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Control plane</p><h1 className="pt-1 text-2xl font-semibold">Super Admin</h1><p className="max-w-2xl pt-2 text-sm leading-6 text-muted-foreground">Operate identity, projects, application features, infrastructure workspaces, and update controls from one authenticated desk.</p></header><section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">{cards.map(([title, description, href]) => <a className="bg-background p-5 transition-colors hover:bg-muted/60" href={href} key={href}><strong>{title}</strong><p className="pt-2 text-sm leading-6 text-muted-foreground">{description}</p></a>)}</section></main>;
}

function UpdatesPage() {
  return <main className="mx-auto grid w-[calc(100%-2rem)] max-w-5xl gap-6 py-6 lg:w-[calc(100%-3rem)]"><header><h1 className="text-2xl font-semibold">Updates</h1><p className="pt-2 text-sm text-muted-foreground">Review repository-owned application versions and open the existing release surfaces.</p></header><section className="divide-y rounded-lg border"><UpdateRow label="Platform web" value={`v ${__APP_VERSION__}`} /><UpdateRow label="DevKit web bundle" value={`v ${devkitWebBundle.version}`} /><UpdateRow href="/sa/devkit-releases" label="Release records" value="Open releases" /><UpdateRow href="/sa/settings" label="Browser application data" value="Open settings" /></section><p className="text-sm leading-6 text-muted-foreground">Desktop installation remains user-approved and uses the signed updater in the installed application. This web portal does not silently install desktop updates.</p></main>;
}

function UpdateRow({ href, label, value }: { href?: string; label: string; value: string }) {
  const content = <><span className="font-medium">{label}</span><span className="text-sm text-muted-foreground">{value}</span></>;
  return href ? <a className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-muted/50" href={href}>{content}</a> : <div className="flex items-center justify-between gap-4 px-4 py-4">{content}</div>;
}

function PageFrame({ children }: { children: React.ReactNode }) { return <main className="mx-auto w-[calc(100%-2rem)] max-w-[92rem] space-y-5 py-5 lg:w-[calc(100%-3rem)]">{children}</main>; }

function menuItems(page: SaPage, workspaceId: string): SidemenuItem[] {
  const workspaceGroups = [...new Set(devkitWebBundle.workspaces.map((workspace) => workspace.group))]
    .map((group) => [group, devkitWebBundle.workspaces.filter((workspace) => workspace.group === group)] as const);
  return [
    { icon: CircleGaugeIcon, isActive: page === "overview" && !workspaceId, title: "Overview", url: "/sa" },
    { icon: UsersIcon, isActive: ["users", "roles", "user-roles"].includes(page), title: "Identity", items: [item("Users", "users", page), item("Roles", "roles", page), item("User roles", "user-roles", page)] },
    { icon: ShieldCheckIcon, isActive: ["permissions", "access", "features"].includes(page), title: "Access", items: [item("Permissions", "permissions", page), item("Role access", "access", page), item("App features", "features", page)] },
    ...workspaceGroups.map(([group, entries]) => ({ icon: group === "Work" ? AppWindowIcon : BlocksIcon, isActive: entries.some((entry) => entry.id === workspaceId), title: group, items: entries.map((entry) => ({ isActive: entry.id === workspaceId, title: entry.title, url: `/sa/devkit-${entry.id}` })) })),
    { icon: RefreshCwIcon, isActive: ["updates", "settings"].includes(page), title: "System", items: [item("Updates", "updates", page), item("Application data", "settings", page)] }
  ];
}

function item(title: string, target: SaPage, page: SaPage) { return { isActive: page === target, title, url: `/sa/${target}` }; }
function pageFromPath(pathname: string): SaPage { const value = pathname.split("/")[2] as SaPage | undefined; return value && ["access", "features", "permissions", "roles", "settings", "updates", "user-roles", "users"].includes(value) ? value : "overview"; }
function claimsEmail() { try { const token = localStorage.getItem("devkit_session") ?? ""; return (JSON.parse(atob((token.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/"))) as { email?: string }).email ?? ""; } catch { return ""; } }
async function handleLogout() { await logout(); window.location.assign("/sa/login"); }
