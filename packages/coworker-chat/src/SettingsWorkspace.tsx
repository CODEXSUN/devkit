import {
  Archive,
  Bell,
  Cloud,
  ExternalLink,
  KeyRound,
  Laptop,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  X
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { ConnectionServiceWorkspace } from "./ConnectionServiceWorkspace";
import type { MessengerClientKind, MessengerProfile } from "./messenger-client";

type CodexConnection = {
  accountType: string | null;
  available: boolean;
  connected: boolean;
  default: boolean;
  email: string | null;
  error: string | null;
  id: "primary" | "secondary";
  label: string;
  planType: string | null;
};

type DeviceLogin = {
  loginId: string;
  type: "chatgptDeviceCode";
  userCode: string;
  verificationUrl: string;
};

type BrowserLogin = { authUrl: string; loginId: string; type: "chatgpt" };
type SettingsSection = "codex" | "cloud" | "messages" | "archives";

export function SettingsWorkspace({
  apiUrl,
  archivedChatCount,
  clientKind,
  notificationPermission,
  onEnableNotifications,
  onOpenArchived,
  token,
  user
}: {
  apiUrl: string;
  archivedChatCount: number;
  clientKind: MessengerClientKind;
  notificationPermission: NotificationPermission | "unsupported";
  onEnableNotifications: () => void;
  onOpenArchived: () => void;
  token: string;
  user: MessengerProfile | undefined;
}) {
  const [section, setSection] = useState<SettingsSection>("codex");
  const [connections, setConnections] = useState<CodexConnection[]>([]);
  const [deviceLogin, setDeviceLogin] = useState<DeviceLogin>();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const request = useSettingsRequest(apiUrl, token);
  const refreshConnections = useCallback(async () => {
    setConnections(await request<CodexConnection[]>("/orchestration/codex/connections"));
  }, [request]);

  useEffect(() => {
    void refreshConnections().catch((reason) => setMessage(errorMessage(reason)));
  }, [refreshConnections]);

  async function run(name: string, action: () => Promise<void>) {
    setBusy(name);
    setMessage("");
    try {
      await action();
      await refreshConnections();
    } catch (reason) {
      setMessage(errorMessage(reason));
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="settings-space">
      <aside className="settings-navigation" aria-label="Settings sections">
        <nav>
          <SettingsNavButton
            active={section === "codex"}
            icon={<KeyRound size={16} />}
            label="Codex"
            onClick={() => setSection("codex")}
          />
          <SettingsNavButton
            active={section === "cloud"}
            icon={<Cloud size={16} />}
            label="Cloud & devices"
            onClick={() => setSection("cloud")}
          />
          <SettingsNavButton
            active={section === "messages"}
            icon={<Bell size={16} />}
            label="Messages"
            onClick={() => setSection("messages")}
          />
          <SettingsNavButton
            active={section === "archives"}
            icon={<Archive size={16} />}
            label="Archived chats"
            onClick={() => setSection("archives")}
            {...(archivedChatCount ? { suffix: archivedChatCount } : {})}
          />
        </nav>
        {user ? <SignedInUser user={user} /> : null}
      </aside>
      <main className="settings-content">
        {section === "codex" ? (
          <CodexSettings
            busy={busy}
            connections={connections}
            deviceLogin={deviceLogin}
            message={message}
            onBrowserLogin={(connectionId) =>
              void run("browser", async () => {
                const login = await request<BrowserLogin>("/orchestration/codex/browser-login", {
                  body: JSON.stringify({ connectionId }),
                  method: "POST"
                });
                window.open(login.authUrl, "_blank", "noopener,noreferrer");
                setMessage("Finish signing in in the browser, then refresh this page.");
              })
            }
            onCancelDeviceLogin={() =>
              void run("cancel", async () => {
                if (!deviceLogin) return;
                await request("/orchestration/codex/login-cancel", {
                  body: JSON.stringify({ connectionId: "primary", loginId: deviceLogin.loginId }),
                  method: "POST"
                });
                setDeviceLogin(undefined);
                setMessage("Device sign-in cancelled.");
              })
            }
            onDeviceLogin={(connectionId) =>
              void run("device", async () => {
                const login = await request<DeviceLogin>("/orchestration/codex/device-login", {
                  body: JSON.stringify({ connectionId }),
                  method: "POST"
                });
                setDeviceLogin(login);
                setMessage(
                  "Enter the displayed code in your browser to authenticate this local Codex runtime."
                );
              })
            }
            onLogout={(connectionId) =>
              void run("logout", async () => {
                await request("/orchestration/codex/logout", {
                  body: JSON.stringify({ connectionId }),
                  method: "POST"
                });
                setDeviceLogin(undefined);
                setMessage("Codex account disconnected from this device.");
              })
            }
            onRefresh={() => void run("refresh", async () => {})}
          />
        ) : null}
        {section === "cloud" ? (
          <ConnectionServiceWorkspace apiUrl={apiUrl} clientKind={clientKind} token={token} />
        ) : null}
        {section === "messages" ? (
          <MessageSettings
            notificationPermission={notificationPermission}
            onEnableNotifications={onEnableNotifications}
          />
        ) : null}
        {section === "archives" ? (
          <ArchiveSettings archivedChatCount={archivedChatCount} onOpenArchived={onOpenArchived} />
        ) : null}
      </main>
    </section>
  );
}

function SignedInUser({ user }: { user: MessengerProfile }) {
  const initials = user.name
    .split(/\s+/u)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <section className="settings-user" aria-label="Signed-in user">
      <span aria-hidden="true">{initials || "U"}</span>
      <div>
        <strong>{user.name}</strong>
        <small>{user.email}</small>
      </div>
    </section>
  );
}

function CodexSettings({
  busy,
  connections,
  deviceLogin,
  message,
  onBrowserLogin,
  onCancelDeviceLogin,
  onDeviceLogin,
  onLogout,
  onRefresh
}: {
  busy: string;
  connections: CodexConnection[];
  deviceLogin: DeviceLogin | undefined;
  message: string;
  onBrowserLogin: (id: CodexConnection["id"]) => void;
  onCancelDeviceLogin: () => void;
  onDeviceLogin: (id: CodexConnection["id"]) => void;
  onLogout: (id: CodexConnection["id"]) => void;
  onRefresh: () => void;
}) {
  const primary = connections.find((connection) => connection.default) ?? connections[0];
  return (
    <section className="settings-panel codex-settings-panel">
      <header>
        <KeyRound size={20} />
        <div>
          <h2>Codex connection</h2>
          <p>
            Use the local Codex runtime for project-aware agent work. Account credentials remain on
            this device.
          </p>
        </div>
        <button
          aria-label="Refresh Codex connection"
          className="settings-icon-button"
          disabled={busy === "refresh"}
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw size={16} />
        </button>
      </header>
      {message ? (
        <p className="settings-message" role="status">
          {message}
        </p>
      ) : null}
      {primary ? (
        <div className="codex-connection-card">
          <div className="codex-connection-summary">
            <span className={primary.connected ? "settings-status connected" : "settings-status"}>
              <i />
              {primary.connected
                ? "Connected"
                : primary.available
                  ? "Not signed in"
                  : "Runtime unavailable"}
            </span>
            <div>
              <strong>{primary.label}</strong>
              <p>
                {primary.connected
                  ? `${primary.email ?? "Connected account"}${primary.planType ? ` · ${primary.planType}` : ""}`
                  : (primary.error ?? "Sign in to enable agent chats on this desktop.")}
              </p>
            </div>
          </div>
          {primary.connected ? (
            <div className="codex-connected-actions">
              <button disabled={Boolean(busy)} onClick={() => onLogout(primary.id)} type="button">
                Disconnect
              </button>
              <span>
                <Laptop size={15} /> Local desktop runtime
              </span>
            </div>
          ) : (
            <div className="codex-auth-actions">
              <button
                className="settings-primary"
                disabled={Boolean(busy) || !primary.available}
                onClick={() => onBrowserLogin(primary.id)}
                type="button"
              >
                <ExternalLink size={15} /> Sign in in browser
              </button>
              <button
                disabled={Boolean(busy) || !primary.available}
                onClick={() => onDeviceLogin(primary.id)}
                type="button"
              >
                <Smartphone size={15} /> Use device code
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="settings-loading">
          <LoaderCircle size={16} /> Checking the local Codex runtime…
        </p>
      )}
      {deviceLogin ? (
        <div className="device-login-card">
          <div>
            <small>DEVICE AUTHENTICATION</small>
            <strong>{deviceLogin.userCode}</strong>
            <p>Open the verification page, sign in, and enter this one-time code.</p>
          </div>
          <a href={deviceLogin.verificationUrl} rel="noreferrer" target="_blank">
            Open verification <ExternalLink size={15} />
          </a>
          <button aria-label="Cancel device sign-in" onClick={onCancelDeviceLogin} type="button">
            <X size={16} />
          </button>
        </div>
      ) : null}
      <section className="settings-security-note">
        <ShieldCheck size={18} />
        <p>
          <strong>Mobile uses the cloud bridge.</strong> Connect a mobile device from Cloud &
          devices with a one-time code; local repositories, credentials, and agent secrets are never
          copied to the phone.
        </p>
      </section>
    </section>
  );
}

function MessageSettings({
  notificationPermission,
  onEnableNotifications
}: {
  notificationPermission: NotificationPermission | "unsupported";
  onEnableNotifications: () => void;
}) {
  return (
    <SettingsPanel
      icon={<Bell size={20} />}
      title="Message notifications"
      copy="Choose whether this device can notify you about new shared messages."
    >
      <div className="settings-row">
        <div>
          <strong>{notificationLabel(notificationPermission)}</strong>
          <p>Notification permission is controlled by this browser or device.</p>
        </div>
        <button
          className="settings-primary"
          disabled={notificationPermission !== "default"}
          onClick={onEnableNotifications}
          type="button"
        >
          Enable notifications
        </button>
      </div>
    </SettingsPanel>
  );
}

function ArchiveSettings({
  archivedChatCount,
  onOpenArchived
}: {
  archivedChatCount: number;
  onOpenArchived: () => void;
}) {
  return (
    <SettingsPanel
      icon={<Archive size={20} />}
      title="Archived chats"
      copy="Archived conversations are kept until you permanently delete them."
    >
      <div className="settings-row">
        <div>
          <strong>
            {archivedChatCount
              ? `${archivedChatCount} archived ${archivedChatCount === 1 ? "chat" : "chats"}`
              : "No archived chats"}
          </strong>
          <p>Restore a conversation or permanently remove it from its archive page.</p>
        </div>
        <button className="settings-primary" onClick={onOpenArchived} type="button">
          Open archive
        </button>
      </div>
    </SettingsPanel>
  );
}

function SettingsPanel({
  children,
  copy,
  icon,
  title
}: {
  children: ReactNode;
  copy: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="settings-panel">
      <header>
        {icon}
        <div>
          <h2>{title}</h2>
          <p>{copy}</p>
        </div>
      </header>
      {children}
    </section>
  );
}
function SettingsNavButton({
  active,
  icon,
  label,
  onClick,
  suffix
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  suffix?: number;
}) {
  return (
    <button aria-current={active ? "page" : undefined} onClick={onClick} type="button">
      {icon}
      <span>{label}</span>
      {suffix ? <small>{suffix}</small> : null}
    </button>
  );
}
function useSettingsRequest(apiUrl: string, token: string) {
  return useCallback(
    async <T,>(path: string, init: RequestInit = {}) => {
      const response = await fetch(`${apiUrl.replace(/\/+$/u, "")}/api/devkit${path}`, {
        ...init,
        headers: {
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          Authorization: `Bearer ${token}`,
          ...init.headers
        }
      });
      const envelope = (await response.json()) as {
        data?: T;
        error?: { message?: string };
        success: boolean;
      };
      if (!response.ok || !envelope.success)
        throw new Error(envelope.error?.message ?? `Settings request failed (${response.status}).`);
      return envelope.data as T;
    },
    [apiUrl, token]
  );
}
function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : "Settings request failed.";
}
function notificationLabel(permission: NotificationPermission | "unsupported") {
  if (permission === "granted") return "Notifications enabled";
  if (permission === "denied") return "Notifications blocked by system";
  if (permission === "unsupported") return "Notifications unavailable";
  return "Notifications are not enabled";
}
