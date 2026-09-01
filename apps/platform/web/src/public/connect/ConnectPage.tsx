import { Check, Copy, Link2, LoaderCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { apiPost, getToken, tokenIsCurrent } from "../../shared/api/platform-api";

type GeneratedToken = { createdAt: string; label: string; token: string };

export function ConnectPage() {
  const device = requestedDevice();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
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
      .then((result) => setCode(result.token))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Connection code could not be created."));
  }, [device]);

  return (
    <main className="cloud-connect-page">
      <section>
        <span className="cloud-connect-icon"><Link2 size={21} /></span>
        <small>CODELOGICX CLOUD · WEB-DEVKIT</small>
        <h1>Connect {device}</h1>
        <p>Scan the QR code or enter the connection code on your device.</p>
        {error ? <div className="cloud-connect-error" role="alert">{error}</div> : null}
        {!code && !error ? <div className="cloud-connect-loading"><LoaderCircle size={18} /> Creating a secure code…</div> : null}
        {code ? (
          <div className="cloud-connect-credential">
            <div className="cloud-connect-qr">
              <QRCodeSVG level="Q" marginSize={2} size={184} title={`Connection code for ${device}`} value={code} />
            </div>
            <div className="cloud-connect-code">
              <span><small>CONNECTION CODE</small><code>{code}</code></span>
              <button onClick={() => void navigator.clipboard.writeText(code).then(() => setCopied(true))} type="button">
                {copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy code"}
              </button>
            </div>
          </div>
        ) : null}
        <footer>The credential is shown only on this signed-in page, stored as a hash in web-devkit, and encrypted on the connected device.</footer>
      </section>
    </main>
  );
}

function requestedDevice() {
  const device = new URLSearchParams(window.location.search).get("device")?.trim();
  return device === "mobile-devkit" ? device : "desktop-devkit";
}
