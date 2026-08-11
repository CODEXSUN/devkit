import { apiGet, apiPost } from "../../shared/api/devkit-api";
import type {
  CodexStatus,
  BrowserLogin,
  DeviceLogin,
  LaunchDeskInput,
  LaunchDeskStreamEvent
} from "./launch-desk.types";

export const getCodexStatus = () => apiGet<CodexStatus>("/orchestration/codex/status");
export const startCodexDeviceLogin = () =>
  apiPost<DeviceLogin>("/orchestration/codex/device-login");
export const startCodexBrowserLogin = () =>
  apiPost<BrowserLogin>("/orchestration/codex/browser-login");
export const cancelCodexLogin = (loginId: string) =>
  apiPost<{ cancelled: true }>("/orchestration/codex/login-cancel", { loginId });
export const logoutCodex = () => apiPost<{ disconnected: true }>("/orchestration/codex/logout");

export async function streamLaunchPlan(
  input: LaunchDeskInput,
  onEvent: (event: LaunchDeskStreamEvent) => void,
  signal?: AbortSignal
) {
  const baseUrl = import.meta.env.VITE_PLATFORM_API_URL.replace(/\/+$/u, "");
  const token = window.localStorage.getItem("devkit_session");
  const response = await fetch(`${baseUrl}/api/devkit/orchestration/launch-desk/stream`, {
    method: "POST",
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(signal ? { signal } : {})
  });
  if (!response.ok || !response.body) {
    const body = await response.text();
    throw new Error(body || `Launch Desk request failed (${response.status}).`);
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) onEvent(JSON.parse(line) as LaunchDeskStreamEvent);
    }
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as LaunchDeskStreamEvent);
}
