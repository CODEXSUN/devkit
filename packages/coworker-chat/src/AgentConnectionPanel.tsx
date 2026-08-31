import { Bot, CheckCircle2, CircleAlert, Cpu, LoaderCircle, ShieldCheck } from "lucide-react";
import type { MessengerConnectionState } from "./MessengerConnectionPanel";

type AgentConnectionPanelProps = {
  agent?: string;
  detail?: string | undefined;
  model?: string;
  state: MessengerConnectionState;
};

export function AgentConnectionPanel({
  agent = "Codex",
  detail,
  model = "gpt-5.6-terra",
  state
}: AgentConnectionPanelProps) {
  const online = state === "connected";
  const reconnecting = state === "reconnecting";

  return (
    <div className="messenger-connection-panel agent-properties-panel">
      <header>
        <span><Bot size={17} /></span>
        <div><strong>Agent properties</strong><small>Local coding assistant</small></div>
      </header>
      <ConnectionStatus detail={detail} state={state} />
      <section className="messenger-connection-facts">
        <div><Bot size={16} /><span><strong>Connected agent</strong><small>{agent}</small></span></div>
        <div><Cpu size={16} /><span><strong>Active model</strong><small>{model}</small></span></div>
        <div><ShieldCheck size={16} /><span><strong>Private by design</strong><small>Credentials and files stay local</small></span></div>
      </section>
      <footer><i className={online ? "online" : reconnecting ? "reconnecting" : "offline"} /><strong>{online ? "Online" : reconnecting ? "Reconnecting" : "Offline"}</strong><span>{online ? `${agent} is ready` : reconnecting ? `Restoring ${agent}` : `${agent} is unavailable`}</span></footer>
    </div>
  );
}

function ConnectionStatus({ detail, state }: { detail?: string | undefined; state: MessengerConnectionState }) {
  return (
    <section className="messenger-connection-state" aria-live="polite">
      {state === "connecting" ? <LoaderCircle className="messenger-spin" size={19} /> : state === "connected" ? <CheckCircle2 size={19} /> : <CircleAlert size={19} />}
      <div><strong>{stateLabel(state)}</strong><p>{detail ?? stateDescription(state)}</p></div>
    </section>
  );
}

function stateLabel(state: MessengerConnectionState) {
  if (state === "connected") return "Agent online";
  if (state === "connecting") return "Connecting agent";
  if (state === "reconnecting") return "Reconnecting agent";
  if (state === "error") return "Agent needs attention";
  return "Agent offline";
}

function stateDescription(state: MessengerConnectionState) {
  if (state === "connected") return "Ready to inspect, plan, review, and work with this project.";
  if (state === "connecting") return "Connecting to the local agent runtime.";
  if (state === "reconnecting") return "Restoring the live connection to the local agent runtime.";
  if (state === "error") return "The latest agent connection could not finish.";
  return "Reconnect the local runtime to continue agent work.";
}
