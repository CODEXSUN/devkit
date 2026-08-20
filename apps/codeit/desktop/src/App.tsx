import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ChevronDown, Menu, ShieldCheck, Sparkles } from "lucide-react";
import "./styles.css";
import { ThemeProvider } from "./theme";
import { LeftDrawer } from "./components/LeftDrawer";
import { RightDrawer } from "./components/RightDrawer";
import { ChatWorkspace } from "./components/ChatWorkspace";
import { Breadcrumbs, type BreadcrumbItem } from "./components/Breadcrumbs";
import { SettingsView } from "./components/SettingsView";
import { NavigationDrawer } from "./components/NavigationDrawer";

interface WelcomeMessage {
  title: string;
  message: string;
  version: string;
  features: string[];
}

export function AppContent() {
  const [welcome, setWelcome] = useState<WelcomeMessage | null>(null);

  // View Navigation State ("chat" | "settings")
  const [currentView, setCurrentView] = useState<"chat" | "settings">("chat");

  // Nav Drawer State (Extra Left Drawer)
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);

  // IDE State
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [activeFile] = useState("src/App.tsx");
  const [activeThreadId, setActiveThreadId] = useState("1");
  const [selectedModel, setSelectedModel] = useState("deepseek-v4-flash-free");

  useEffect(() => {
    loadWelcomeMessage();
  }, []);

  async function loadWelcomeMessage() {
    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const msg = await invoke<WelcomeMessage>("get_welcome_message");
        setWelcome(msg);
        return;
      }
    } catch (error) {
      console.warn("[CodeIt] Native IPC welcome message call skipped:", error);
    }

    // Default Web & Dev Welcome Message Fallback
    setWelcome({
      title: "CodeIt AI IDE",
      message: "Connected to CodeIt AI Chat",
      version: "0.1.0",
      features: ["Native Rust IPC", "OpenCode AI Engine", "Multi-Turn Thread Context"],
    });
  }

  if (!welcome) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-medium text-muted-foreground">Connecting to CodeIt AI Chat...</p>
      </div>
    );
  }

  // Breadcrumbs path items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "CodeIt Workspace", icon: "folder" },
    { label: "IDE Engine", icon: "terminal" },
    { label: activeFile, icon: "file" },
  ];

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden select-none">
      {/* Slide-out Navigation Drawer (Extra Left Drawer) */}
      <NavigationDrawer
        isOpen={isNavDrawerOpen}
        onClose={() => setIsNavDrawerOpen(false)}
        onNavigate={(view) => setCurrentView(view)}
        currentView={currentView}
      />

      <header className="codeit-app-bar">
        <div className="codeit-app-brand">
          <button
            onClick={() => setIsNavDrawerOpen(!isNavDrawerOpen)}
            title="Open CodeIt Navigation Menu"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all active:scale-95"
          >
            <Menu size={18} />
          </button>

        </div>
        <div className="codeit-app-workspace"><Breadcrumbs items={breadcrumbItems} /></div>
        <button className="codeit-app-model" title="Current model" type="button">
          <Sparkles size={13} /> {selectedModel} <ChevronDown size={13} />
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {currentView === "settings" ? (
          /* Full Window Settings Page */
          <SettingsView
            onBackToChat={() => setCurrentView("chat")}
            selectedModel={selectedModel}
            onSelectModel={(id) => setSelectedModel(id)}
          />
        ) : (
          /* 3-Column AI Chat IDE Window */
          <>
            {/* Left Drawer (Session History & New Chat) */}
            <LeftDrawer
              collapsed={isLeftCollapsed}
              onToggleCollapse={() => setIsLeftCollapsed(!isLeftCollapsed)}
              activeThreadId={activeThreadId}
              onSelectThread={(id) => setActiveThreadId(id)}
              onNewChat={() => {
                setActiveThreadId(Date.now().toString());
                setCurrentView("chat");
              }}
            />

            {/* Center AI Chat Workspace */}
            <ChatWorkspace
              activeFile={activeFile}
              activeThreadId={activeThreadId}
              selectedModel={selectedModel}
            />

            {/* Right Drawer (Inspector, Model Selector & System Telemetry) */}
            <RightDrawer
              collapsed={isRightCollapsed}
              onToggleCollapse={() => setIsRightCollapsed(!isRightCollapsed)}
              activeFile={activeFile}
              onOpenSettings={() => setCurrentView("settings")}
            />
          </>
        )}
      </div>
      <footer className="codeit-status-bar">
        <span className="codeit-status-version">v{welcome.version}</span>
        <span className="codeit-status-divider" />
        <span>Workspace: CodeIt</span>
        <span className="codeit-status-ready"><i /> Local runtime ready</span>
        <span className="codeit-status-context">Context: {activeFile}</span>
        <span className="codeit-status-security"><ShieldCheck size={13} /> Security sandbox active</span>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <AppContent />
    </ThemeProvider>
  );
}
