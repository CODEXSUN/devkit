import { MessengerConnectionPanel, type MessengerConnectionState } from "@codexsun/coworker-chat/messenger";
import type { DesktopNodeState } from "../services/desktop-node-connector";

export function AgentSidePanel({ state }: { state: DesktopNodeState }) {
  return <MessengerConnectionPanel client="desktop" detail={state.detail} state={toConnectionState(state.status)} />;
}

function toConnectionState(status: DesktopNodeState["status"]): MessengerConnectionState {
  if (status === "working" || status === "connected") return "connected";
  if (status === "connecting") return "connecting";
  if (status === "error") return "error";
  return "offline";
}
