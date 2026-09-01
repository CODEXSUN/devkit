import { Cloud, ExternalLink, Link2, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ConnectionStatus = {
  bound: boolean;
  cloudUrl: string;
  instanceId: string;
  lastError: string | null;
  lastVerifiedAt: string | null;
  pendingRecords: number;
  remoteRevision: number;
  role: "cloud" | "disabled" | "local";
  status: "bound" | "conflict" | "disabled" | "error" | "unbound";
};
type ConnectionToken = {
  label: string;
  lastUsedAt: string | null;
  status: "active" | "revoked";
  uuid: string;
};

export function ConnectionServiceWorkspace({
  apiUrl,
  clientKind,
  token
}: {
  apiUrl: string;
  clientKind: "desktop" | "mobile" | "web";
  token: string;
}) {
  const request = useConnectionRequest(apiUrl, token);
  const [status, setStatus] = useState<ConnectionStatus>();
  const [connectionToken, setConnectionToken] = useState("");
  const [cloudUrl, setCloudUrl] = useState("https://devkit.codexsun.com");
  const [issuedTokens, setIssuedTokens] = useState<ConnectionToken[]>([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const refresh = useCallback(async () => {
    const next = await request<ConnectionStatus>("/admin/sync/status");
    setStatus(next);
    setCloudUrl(next.cloudUrl);
    if (next.role === "cloud")
      setIssuedTokens(await request<ConnectionToken[]>("/admin/sync/cloud/tokens"));
  }, [request]);

  useEffect(() => {
    void refresh().catch((error) => setMessage(errorMessage(error)));
  }, [refresh]);

  async function act(name: string, action: () => Promise<void>) {
    setBusy(name);
    setMessage("");
    try {
      await action();
      await refresh();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="connection-service-space">
      <header>
        <span className="connection-service-mark">
          <Link2 size={19} />
        </span>
        <div>
          <small>SERVICES</small>
          <h1>Connect Service</h1>
          <p>Connect your signed-in DevKit account to this device and its approved workspaces.</p>
        </div>
      </header>
      <section className="connection-service-layout">
        <article className="connection-service-primary">
          <div className="connection-service-heading">
            <span>
              <Cloud size={18} />
            </span>
            <div>
              <h2>Cloud workspace bridge</h2>
              <p>{statusCopy(status)}</p>
            </div>
            <strong data-status={status?.status}>
              {status?.status === "bound" ? "Connected" : "Not connected"}
            </strong>
          </div>
          {message ? (
            <p className="connection-service-message" role="status">
              {message}
            </p>
          ) : null}
          {!status ? <p className="connection-service-loading">Reading connection…</p> : null}
          {status?.role === "local" && !status.bound ? (
            <div className="connection-service-form">
              <label>
                <span>Cloud domain</span>
                <input onChange={(event) => setCloudUrl(event.target.value)} placeholder="https://devkit.codexsun.com" type="url" value={cloudUrl} />
              </label>
              <p className="connection-service-device">Connecting as <strong>{deviceIdentity(clientKind)}</strong></p>
              <label>
                <span>One-time code</span>
                <input
                  maxLength={16}
                  onChange={(event) => setConnectionToken(event.target.value.replace(/\s/gu, ""))}
                  placeholder="Paste the 16-character code"
                  value={connectionToken}
                />
              </label>
              <button
                disabled={busy === "connect"}
                onClick={() => {
                  try {
                    openSecureCodePage(connectUrl(cloudUrl, deviceIdentity(clientKind)));
                  } catch {
                    setMessage("Enter a valid cloud domain, including https://.");
                  }
                }}
                type="button"
              >
                <ExternalLink size={17} /> Open secure code page
              </button>
              <button
                disabled={
                  busy === "connect" ||
                  connectionToken.length !== 16
                }
                onClick={() =>
                  void act("connect", async () => {
                    await request("/admin/sync/bind", {
                      body: JSON.stringify({
                        cloudUrl: normalizedCloudUrl(cloudUrl),
                        instanceId: deviceIdentity(clientKind),
                        token: connectionToken
                      }),
                      method: "POST"
                    });
                    setConnectionToken("");
                    setMessage("This device is connected to your cloud workspaces.");
                  })
                }
                type="button"
              >
                <Link2 size={17} /> Verify and connect
              </button>
            </div>
          ) : null}
          {status?.role === "local" && status.bound ? (
            <div className="connection-service-connected">
              <dl>
                <div>
                  <dt>Device</dt>
                  <dd>{status.instanceId}</dd>
                </div>
                <div>
                  <dt>Cloud revision</dt>
                  <dd>{status.remoteRevision}</dd>
                </div>
                <div>
                  <dt>Pending changes</dt>
                  <dd>{status.pendingRecords}</dd>
                </div>
                <div>
                  <dt>Last verified</dt>
                  <dd>{formatDate(status.lastVerifiedAt)}</dd>
                </div>
              </dl>
              <div className="connection-service-actions">
                <button
                  disabled={Boolean(busy)}
                  onClick={() =>
                    void act("verify", async () => {
                      await request("/admin/sync/verify", { body: "{}", method: "POST" });
                      setMessage("Connection verified.");
                    })
                  }
                  type="button"
                >
                  <RefreshCw size={16} /> Verify
                </button>
                <button
                  className="primary"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    void act("publish", async () => {
                      await request("/admin/sync/publish", { body: "{}", method: "POST" });
                      setMessage("Approved workspace changes published.");
                    })
                  }
                  type="button"
                >
                  <Cloud size={16} /> Publish
                </button>
                <button
                  disabled={Boolean(busy)}
                  onClick={() =>
                    void act("disconnect", async () => {
                      await request("/admin/sync/bind", { method: "DELETE" });
                      setMessage("Device disconnected. Local files were kept.");
                    })
                  }
                  type="button"
                >
                  <Unplug size={16} /> Disconnect
                </button>
              </div>
            </div>
          ) : null}
          {status?.role === "cloud" ? (
            <div className="connection-service-cloud">
              <p className="connection-service-device">This installation is the <strong>web-devkit cloud server</strong>. Signed-in users issue one-time codes from <code>/connect</code>. Each code expires after 10 minutes and becomes unusable after exchange.</p>
              <div className="connection-service-devices">
                <h3>Your device codes</h3>
                {issuedTokens.length ? (
                  issuedTokens.map((item) => (
                    <div key={item.uuid}>
                      <span>
                        <strong>{item.label}</strong>
                        <small>
                          {item.lastUsedAt
                            ? `Last connected ${formatDate(item.lastUsedAt)}`
                            : "Waiting for connection"}
                        </small>
                      </span>
                      <em>{item.status}</em>
                    </div>
                  ))
                ) : (
                  <p>No device codes issued yet.</p>
                )}
              </div>
            </div>
          ) : null}
        </article>
        <aside className="connection-service-help">
          <h2>Connect another device</h2>
          <ol>
            <li>
              <b>1.</b>
              <span>Generate a one-time code while signed in to your cloud account.</span>
            </li>
            <li>
              <b>2.</b>
              <span>Open Connect Service on desktop, web, or mobile.</span>
            </li>
            <li>
              <b>3.</b>
              <span>Enter the code and verify the connected account.</span>
            </li>
          </ol>
          <div>
            <ShieldCheck size={18} />
            <p>
              Repositories, credentials, environment files, builds, and agent secrets remain on the
              device.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function useConnectionRequest(apiUrl: string, token: string) {
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
        throw new Error(
          envelope.error?.message || `Connection request failed (${response.status}).`
        );
      return envelope.data as T;
    },
    [apiUrl, token]
  );
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Connection request failed.";
}
function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}
function statusCopy(status?: ConnectionStatus) {
  if (!status) return "Checking the signed-in account.";
  if (status.role === "cloud") return "Issue account codes and review connected devices.";
  if (status.bound) return `Signed in · ${status.cloudUrl}`;
  return "Waiting for a one-time code from your cloud account.";
}

function normalizedCloudUrl(value: string) {
  return new URL(value.trim()).origin;
}

function connectUrl(cloudUrl: string, instanceId: string) {
  const url = new URL("/connect", normalizedCloudUrl(cloudUrl));
  url.searchParams.set("device", instanceId.trim());
  return url.toString();
}

function openSecureCodePage(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener noreferrer";
  link.target = "_blank";
  document.body.append(link);
  link.click();
  link.remove();
}

function deviceIdentity(clientKind: "desktop" | "mobile" | "web") {
  return `${clientKind}-devkit`;
}
