import { Component, lazy, StrictMode, Suspense, useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { MessengerChat } from "@codexsun/coworker-chat/messenger";
import "@codexsun/ui/styles.css";
import "@codexsun/coworker-chat/styles.css";
import "./styles.css";
import type { DesktopNodeState } from "./services/desktop-node-connector";
import devkitLogo from "../src-tauri/icons/64x64.png?url";

document.documentElement.classList.remove("dark");
document.documentElement.dataset.theme = "light";
document.documentElement.style.colorScheme = "light";

const centralApiUrl = import.meta.env.VITE_COWORKER_API_URL ?? "http://127.0.0.1:9050";
const CoworkerChat = lazy(() =>
  import("@codexsun/coworker-chat").then((module) => ({ default: module.CoworkerChat }))
);
const AgentSidePanel = lazy(() =>
  import("./components/AgentSidePanel").then((module) => ({ default: module.AgentSidePanel }))
);

function WorkspaceLoadingScreen() {
  return (
    <main className="desktop-messenger-loading">
      <div><span /><strong>Opening DevKit</strong><small>Connecting your workspace…</small></div>
    </main>
  );
}

type MessengerBoundaryProps = { children: ReactNode };
type MessengerBoundaryState = { hasError: boolean };

class MessengerBoundary extends Component<MessengerBoundaryProps, MessengerBoundaryState> {
  state: MessengerBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MessengerBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("DevKit Messenger failed to render.", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="desktop-messenger-error" role="alert">
          <strong>Messenger could not open</strong>
          <p>Please restart DevKit. Your conversations remain safe.</p>
        </main>
      );
    }

    return this.props.children;
  }
}

function releaseStartupLoader() {
  const loader = document.getElementById("startup-loader");
  if (!loader || loader.dataset.state === "ready") return;

  window.requestAnimationFrame(() => {
    loader.dataset.state = "ready";
    window.setTimeout(() => loader.remove(), 160);
  });
}

function AppRoot() {
  const [sessionToken, setSessionToken] = useState<string | null>(() => localStorage.getItem("devkit_session"));
  const [messengerDrawerCollapsed, setMessengerDrawerCollapsed] = useState(true);
  const [nodeState, setNodeState] = useState<DesktopNodeState>({ status: "disconnected" });
  const [agentPanelOpen, setAgentPanelOpen] = useState(false);
  useEffect(() => {
    releaseStartupLoader();
  }, []);
  useEffect(() => {
    if (!sessionToken) return;
    let disposed = false;
    void fetch(`${centralApiUrl.replace(/\/+$/u, "")}/auth/session`, {
      headers: { Authorization: `Bearer ${sessionToken}` }
    }).then((response) => {
      if (disposed || response.ok || response.status !== 401) return;
      localStorage.removeItem("devkit_session");
      setSessionToken(null);
    }).catch(() => undefined);
    return () => { disposed = true; };
  }, [sessionToken]);
  useEffect(() => {
    if (!sessionToken) return;
    let disposed = false;
    let disconnect: () => void = () => undefined;
    void import("./services/desktop-node-connector").then(({ DesktopNodeConnector }) => {
      if (disposed) return;
      const nodeConnector = new DesktopNodeConnector(setNodeState);
      nodeConnector.connect(centralApiUrl, sessionToken);
      disconnect = () => nodeConnector.disconnect();
    });
    return () => {
      disposed = true;
      disconnect();
    };
  }, [sessionToken]);

  if (sessionToken)
    return (
      <MessengerBoundary>
        <MessengerChat
          apiUrl={centralApiUrl}
          clientKind="desktop"
          drawerCollapsed={messengerDrawerCollapsed}
          logoSrc={devkitLogo}
          onDrawerCollapsedChange={setMessengerDrawerCollapsed}
          onOpenAi={() => setAgentPanelOpen(true)}
          onToggleSidePanel={() => setAgentPanelOpen((open) => !open)}
          product="DevKit"
          sidePanel={<Suspense fallback={null}><AgentSidePanel state={nodeState} /></Suspense>}
          sidePanelOpen={agentPanelOpen}
          token={sessionToken}
        />
      </MessengerBoundary>
    );

  return (
    <Suspense fallback={<WorkspaceLoadingScreen />}>
      <CoworkerChat
        apiUrl={centralApiUrl}
        logoSrc={devkitLogo}
        onSessionTokenChange={setSessionToken}
        product="DevKit"
      />
    </Suspense>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>
);
