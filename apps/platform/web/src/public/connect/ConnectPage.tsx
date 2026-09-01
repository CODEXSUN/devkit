import { Check, Copy, Link2, LoaderCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { apiPost, getToken, tokenIsCurrent } from "../../shared/api/platform-api";

type GeneratedToken = { createdAt: string; expiresAt: string; label: string; token: string };

export function ConnectPage() {
  const device = requestedDevice();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (!tokenIsCurrent(getToken())) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (started.current) return;
    started.current = true;
    void apiPost<GeneratedToken>("/api/devkit/admin/sync/cloud/tokens", { label: device })
      .then((result) => {
        setCode(result.token);
        setExpiresAt(result.expiresAt);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Connection code could not be created."));
  }, [device]);

  useEffect(() => {
    if (!expiresAt) return;
    const delay = new Date(expiresAt).getTime() - Date.now();
    const timer = window.setTimeout(() => {
      setCode("");
      setError("This connection code expired. Refresh the page to create a new code.");
    }, Math.max(delay, 0));
    return () => window.clearTimeout(timer);
  }, [expiresAt]);

  return (
    <main className="cloud-connect-page">
      <section>
        <span className="cloud-connect-icon"><Link2 size={21} /></span>
        <small>CODELOGICX CLOUD · WEB-DEVKIT</small>
        <h1>Connect {device}</h1>
        <p>Use this short-lived code once in Connect Service on your desktop, web, or mobile device.</p>
        {error ? <div className="cloud-connect-error" role="alert">{error}</div> : null}
        {!code && !error ? <div className="cloud-connect-loading"><LoaderCircle size={18} /> Creating a secure code…</div> : null}
        {code ? (
          <div className="cloud-connect-credential">
            <div className="cloud-connect-qr">
              <QRCodeSVG level="Q" marginSize={2} size={184} title={`Connection code for ${device}`} value={code} />
            </div>
            <div className="cloud-connect-code">
              <span><small>ONE-TIME CODE · EXPIRES IN 10 MINUTES</small><code>{code}</code></span>
              <button onClick={() => void navigator.clipboard.writeText(code).then(() => setCopied(true))} type="button">
                {copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy code"}
              </button>
            </div>
          </div>
        ) : null}
        <footer>The code is shown only on this signed-in page. After it is exchanged, the device stores an encrypted device secret and the code cannot be reused.</footer>
      </section>
    </main>
  );
}

function requestedDevice() {
  const device = new URLSearchParams(window.location.search).get("device")?.trim();
  return device === "mobile-devkit" ? device : "desktop-devkit";
}
