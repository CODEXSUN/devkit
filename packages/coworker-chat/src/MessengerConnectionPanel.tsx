import { CheckCircle2, CircleAlert, Laptop, LoaderCircle, ShieldCheck } from "lucide-react";

export type MessengerConnectionState = "connected" | "connecting" | "error" | "offline";

type MessengerConnectionPanelProps = {
  client: "desktop" | "web";
  detail?: string | undefined;
  state: MessengerConnectionState;
};

export function MessengerConnectionPanel({ client, detail, state }: MessengerConnectionPanelProps) {
  const connected = state === "connected";

  return (
    <div className="messenger-connection-panel">
      <header>
        <span>{connectionIcon(state)}</span>
        <div><strong>Connection</strong><small>{client === "desktop" ? "Local execution node" : "Shared workspace sync"}</small></div>
      </header>
      <section className="messenger-connection-state" aria-live="polite">
        {state === "connecting" ? <LoaderCircle className="messenger-spin" size={19} /> : state === "connected" ? <CheckCircle2 size={19} /> : <CircleAlert size={19} />}
        <div><strong>{stateLabel(state)}</strong><p>{detail ?? stateDescription(client, state)}</p></div>
      </section>
      <section className="messenger-connection-facts">
        <div><Laptop size={16} /><span><strong>{client === "desktop" ? "This desktop" : "This browser"}</strong><small>{client === "desktop" ? "Codex and workspace execution" : "Messages shared with your signed-in devices"}</small></span></div>
        <div><ShieldCheck size={16} /><span><strong>Private by design</strong><small>Credentials and files stay local</small></span></div>
      </section>
      <footer><i className={connected ? "online" : ""} />{connected ? client === "desktop" ? "Ready for web and mobile" : "Messenger sync is active" : "Waiting for connection"}</footer>
    </div>
  );
}

function connectionIcon(state: MessengerConnectionState) {
  if (state === "connecting") return <LoaderCircle className="messenger-spin" size={17} />;
  return <Laptop size={17} />;
}

function stateLabel(state: MessengerConnectionState) {
  if (state === "connected") return "Connected";
  if (state === "connecting") return "Connecting";
  if (state === "error") return "Needs attention";
  return "Offline";
}

function stateDescription(client: MessengerConnectionPanelProps["client"], state: MessengerConnectionState) {
  if (state === "connected") return client === "desktop" ? "Web and mobile can ask this agent to work." : "Messenger is synchronized across your signed-in devices.";
  if (state === "connecting") return "Authenticating with the shared workspace.";
  if (state === "error") return "The latest connection attempt could not finish.";
  return "Reconnect to continue shared updates.";
}
