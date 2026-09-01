import { Component, lazy, StrictMode, Suspense, useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { openUrl } from "@tauri-apps/plugin-opener";
import { DevelopmentIdsOverlay } from "@codexsun/ui";
import {
  MessengerChat,
  MessengerConnectionPanel,
  type MessengerConnectionState
} from "@codexsun/coworker-chat/messenger";
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
      <div>
        <span />
        <strong>Opening DevKit</strong>
        <small>Connecting your workspace…</small>
      </div>
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
  const [sessionToken, setSessionToken] = useState<string | null>(() =>
    localStorage.getItem("devkit_session")
  );
  const [messengerDrawerCollapsed, setMessengerDrawerCollapsed] = useState(true);
  const [nodeState, setNodeState] = useState<DesktopNodeState>({ status: "disconnected" });
  const [messengerConnectionState, setMessengerConnectionState] =
    useState<MessengerConnectionState>("connecting");
  const [agentPanelOpen, setAgentPanelOpen] = useState(false);
  useEffect(() => {
    releaseStartupLoader();
  }, []);
  useEffect(() => {
    if (!sessionToken) return;
    let disposed = false;
    void fetch(`${centralApiUrl.replace(/\/+$/u, "")}/auth/session`, {
      headers: { Authorization: `Bearer ${sessionToken}` }
    })
      .then((response) => {
        if (disposed || response.ok || response.status !== 401) return;
        localStorage.removeItem("devkit_session");
        setSessionToken(null);
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
    };
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
          agentSidePanel={
            <Suspense fallback={null}>
              <AgentSidePanel state={nodeState} />
            </Suspense>
          }
          apiUrl={centralApiUrl}
          clientKind="desktop"
          drawerCollapsed={messengerDrawerCollapsed}
          logoSrc={devkitLogo}
          onConnectionStateChange={setMessengerConnectionState}
          onDrawerCollapsedChange={setMessengerDrawerCollapsed}
          onOpenExternalUrl={openUrl}
          onSignOut={async () => {
            try {
              await fetch(`${centralApiUrl.replace(/\/+$/u, "")}/auth/logout`, {
                headers: { Authorization: `Bearer ${sessionToken}` },
                method: "POST"
              });
            } finally {
              localStorage.removeItem("devkit_session");
              setSessionToken(null);
            }
          }}
          onUnreadCountChange={updateUnreadTaskbar}
          onToggleSidePanel={() => setAgentPanelOpen((open) => !open)}
          product="DevKit"
          sidePanel={<MessengerConnectionPanel client="desktop" state={messengerConnectionState} />}
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

let previousUnreadCount = 0;

function updateUnreadTaskbar(count: number) {
  const previous = previousUnreadCount;
  previousUnreadCount = count;
  void syncUnreadTaskbar(count, previous).catch(() => undefined);
}

async function syncUnreadTaskbar(count: number, previous: number) {
  const [{ Image }, { getCurrentWindow, UserAttentionType }] = await Promise.all([
    import("@tauri-apps/api/image"),
    import("@tauri-apps/api/window")
  ]);
  const window = getCurrentWindow();
  if (!count) {
    await window.setOverlayIcon();
    return;
  }
  const image = await Image.new(unreadBadgePixels(count), 32, 32);
  try {
    await window.setOverlayIcon(image);
    if (count > previous && !(await window.isFocused())) {
      await window.requestUserAttention(UserAttentionType.Informational);
    }
  } finally {
    await image.close();
  }
}

const digitPixels: Record<string, string[]> = {
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "010", "010", "010"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"]
};

function unreadBadgePixels(count: number) {
  const pixels = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y += 1) {
    for (let x = 0; x < 32; x += 1) {
      if ((x - 16) ** 2 + (y - 16) ** 2 <= 14 ** 2) setPixel(pixels, x, y, [255, 90, 31, 255]);
    }
  }
  const label = String(Math.min(count, 99));
  const scale = label.length === 1 ? 4 : 3;
  const width = label.length * 3 * scale + (label.length - 1) * scale;
  const startX = Math.floor((32 - width) / 2);
  const startY = Math.floor((32 - 5 * scale) / 2);
  [...label].forEach((digit, digitIndex) =>
    digitPixels[digit]?.forEach((row, rowIndex) =>
      [...row].forEach((bit, columnIndex) => {
        if (bit !== "1") return;
        for (let offsetY = 0; offsetY < scale; offsetY += 1)
          for (let offsetX = 0; offsetX < scale; offsetX += 1) {
            setPixel(
              pixels,
              startX + digitIndex * 4 * scale + columnIndex * scale + offsetX,
              startY + rowIndex * scale + offsetY,
              [255, 255, 255, 255]
            );
          }
      })
    )
  );
  return pixels;
}

function setPixel(
  pixels: Uint8Array,
  x: number,
  y: number,
  color: [number, number, number, number]
) {
  const index = (y * 32 + x) * 4;
  pixels.set(color, index);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppRoot />
    <DevelopmentIdsOverlay
      enabled={import.meta.env.VITE_DEV_TECH_IDS === "1"}
      surface="desktop"
    />
  </StrictMode>
);
