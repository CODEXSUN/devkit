import { FolderOpen, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import type { DesktopSetup } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";

export function DesktopSetup({ onComplete, setup }: { onComplete: () => Promise<void>; setup?: DesktopSetup | undefined }) {
  const saved = setup?.profile;
  const [displayName, setDisplayName] = useState(saved?.displayName ?? "");
  const [email, setEmail] = useState(saved?.email ?? "");
  const [rememberIdentity, setRememberIdentity] = useState(saved?.rememberIdentity ?? true);
  const [confirmOnStartup, setConfirmOnStartup] = useState(saved?.confirmOnStartup ?? false);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function continueToWorkspace() {
    setSaving(true);
    setError(undefined);
    try {
      await desktopClient.saveDesktopProfile({ displayName, email: email || null, rememberIdentity, confirmOnStartup });
      await onComplete();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="desktop-setup">
      <section className="desktop-setup-copy">
        <div className="setup-mark"><UserRound size={25} /></div>
        <p className="eyebrow">Local setup</p>
        <h1>Set up this DevKit.</h1>
        <p>Identity and workspace links stay in this computer’s local SQLite database. Nothing is sent to cloud services from this screen.</p>
      </section>
      <section className="desktop-setup-form" aria-label="Local identity setup">
        <label>Display name<input autoFocus value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" /></label>
        <label>Email <span>Optional</span><input inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
        <label className="desktop-setup-check"><input checked={rememberIdentity} onChange={(event) => setRememberIdentity(event.target.checked)} type="checkbox" /><span><strong>Remember me on this computer</strong><small>Use this local identity and recent workspace automatically.</small></span></label>
        <label className="desktop-setup-check"><input checked={confirmOnStartup} disabled={!rememberIdentity} onChange={(event) => setConfirmOnStartup(event.target.checked)} type="checkbox" /><span><strong>Ask before restoring a workspace</strong><small>Recommended on shared computers.</small></span></label>
        {error ? <p className="setup-error" role="alert">{error}</p> : null}
        <button disabled={saving || !displayName.trim()} onClick={() => void continueToWorkspace()} type="button"><FolderOpen size={17} />{saving ? "Saving…" : "Continue to workspace"}</button>
        <p className="desktop-setup-note"><ShieldCheck size={15} /> Workspace code and model credentials are configured separately.</p>
      </section>
    </main>
  );
}
