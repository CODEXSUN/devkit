import {
  Archive,
  Bell,
  Check,
  ChevronUp,
  Cloud,
  Copy,
  ExternalLink,
  KeyRound,
  Laptop,
  LoaderCircle,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  X
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
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
  onOpenExternalUrl,
  onSignOut,
  token,
  user
}: {
  apiUrl: string;
  archivedChatCount: number;
  clientKind: MessengerClientKind;
  notificationPermission: NotificationPermission | "unsupported";
  onEnableNotifications: () => void;
  onOpenArchived: () => void;
  onOpenExternalUrl?: ((url: string) => Promise<void> | void) | undefined;
  onSignOut?: (() => Promise<void> | void) | undefined;
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
    const next = await request<CodexConnection[]>("/orchestration/codex/connections");
    setConnections(next);
    return next;
  }, [request]);

  useEffect(() => {
    void refreshConnections().catch((reason) => setMessage(errorMessage(reason)));
  }, [refreshConnections]);

  useEffect(() => {
    if (!deviceLogin) return;
    let active = true;
    const checkConnection = async () => {
      try {
        const next = await refreshConnections();
        if (!active) return;
        const primary = next.find((connection) => connection.default) ?? next[0];
        if (primary?.connected) {
          setDeviceLogin(undefined);
          setMessage("Codex connected. This device is ready for agent work.");
        }
      } catch {
        // Keep the short-lived login session active through temporary refresh failures.
      }
    };
    void checkConnection();
    const interval = window.setInterval(() => void checkConnection(), 3_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [deviceLogin, refreshConnections]);

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
        {user && onSignOut ? <SignedInUser onSignOut={onSignOut} user={user} /> : null}
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
                await openExternalUrl(login.authUrl, onOpenExternalUrl);
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
                  "Device code ready. Connection status refreshes automatically during this session."
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
            onOpenExternalUrl={onOpenExternalUrl}
            onRefresh={() => void run("refresh", async () => {})}
          />
        ) : null}
        {section === "cloud" ? (
          <ConnectionServiceWorkspace
            apiUrl={apiUrl}
            clientKind={clientKind}
            onOpenExternalUrl={onOpenExternalUrl}
            token={token}
          />
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

function SignedInUser({ onSignOut, user }: { onSignOut: () => Promise<void> | void; user: MessengerProfile }) {
  const [open, setOpen] = useState(false);
  const hostRef = useRef<HTMLElement>(null);
  const initials = user.name
    .split(/\s+/u)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!hostRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);
  return (
    <section className="settings-user" aria-label="Signed-in user" ref={hostRef}>
      {open ? <div className="settings-user-menu" role="menu"><button onClick={() => void onSignOut()} role="menuitem" type="button"><LogOut size={15} /> Sign out</button></div> : null}
      <button aria-expanded={open} aria-haspopup="menu" className="settings-user-trigger" onClick={() => setOpen((current) => !current)} type="button">
        <span aria-hidden="true">{initials || "U"}</span>
        <span><strong>{user.name}</strong><small>{user.email}</small></span>
        <ChevronUp size={15} />
      </button>
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
  onOpenExternalUrl,
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
  onOpenExternalUrl?: ((url: string) => Promise<void> | void) | undefined;
  onRefresh: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const primary = connections.find((connection) => connection.default) ?? connections[0];

  useEffect(() => setCopied(false), [deviceLogin?.userCode]);

  async function copyDeviceCode() {
    if (!deviceLogin) return;
    try {
      await copyText(deviceLogin.userCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  }

  async function openVerification() {
    if (!deviceLogin) return;
    void copyDeviceCode();
    await openExternalUrl(deviceLogin.verificationUrl, onOpenExternalUrl);
  }

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
          disabled={busy === "refresh" || Boolean(primary?.connected)}
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
        <div className={`codex-connection-card${primary.connected ? " connected" : ""}`}>
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
            <span className="device-login-code">
              <strong>{deviceLogin.userCode}</strong>
              <button
                aria-label="Copy device authentication code"
                onClick={() => void copyDeviceCode()}
                title="Copy code"
                type="button"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </span>
            <p>Open the verification page, sign in, and enter this one-time code.</p>
            <small className="device-login-refresh">
              Checking connection automatically every 3 seconds
            </small>
          </div>
          <button
            className="device-login-open"
            onClick={() => void openVerification()}
            type="button"
          >
            Open verification <ExternalLink size={15} />
          </button>
          <button
            aria-label="Copy verification page link"
            className="device-login-open"
            onClick={() => void copyText(deviceLogin.verificationUrl)}
            type="button"
          >
            Copy link <Copy size={15} />
          </button>
          <button
            aria-label="Cancel device sign-in"
            className="device-login-cancel"
            onClick={onCancelDeviceLogin}
            type="button"
          >
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
      const responseText = await response.text();
      let envelope: {
        data?: T;
        error?: { message?: string };
        success: boolean;
      };
      try {
        envelope = JSON.parse(responseText) as typeof envelope;
      } catch {
        const contentType = response.headers.get("Content-Type") || "unknown content type";
        throw new Error(`Settings API returned ${contentType} instead of JSON (${response.status}).`);
      }
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

async function copyText(value: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

async function openExternalUrl(
  url: string,
  openExternalUrlHandler?: ((url: string) => Promise<void> | void) | undefined
) {
  if (openExternalUrlHandler) {
    await openExternalUrlHandler(url);
    return;
  }
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener noreferrer";
  link.target = "_blank";
  document.body.append(link);
  link.click();
  link.remove();
}
