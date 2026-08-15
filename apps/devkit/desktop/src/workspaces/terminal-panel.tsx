import "@xterm/xterm/css/xterm.css";
import { listen } from "@tauri-apps/api/event";
import { Terminal as Xterm } from "@xterm/xterm";
import { TerminalSquare, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TerminalOutput, Workspace } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";

export function TerminalPanel({
  workspace,
  theme
}: {
  workspace: Workspace;
  theme: "dark" | "light";
}) {
  const host = useRef<HTMLDivElement>(null);
  const terminal = useRef<Xterm | undefined>(undefined);
  const session = useRef<string | undefined>(undefined);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!host.current) return;
    const xterm = new Xterm({
      convertEol: true,
      cursorBlink: true,
      fontFamily: '"Cascadia Code", Consolas, monospace',
      fontSize: 12,
      scrollback: 3000,
      theme:
        theme === "dark"
          ? {
              background: "#181a1d",
              foreground: "#e4e7eb",
              cursor: "#6ea8fe",
              selectionBackground: "#34465c"
            }
          : {
              background: "#ffffff",
              foreground: "#34373b",
              cursor: "#1a73e8",
              selectionBackground: "#cfe2fb"
            }
    });
    terminal.current = xterm;
    xterm.open(host.current);
    let disposed = false;
    let removeListener: (() => void) | undefined;
    void listen<TerminalOutput>("terminal-output", (event) => {
      if (event.payload.sessionId === session.current) xterm.write(event.payload.data);
    }).then((remove) => {
      removeListener = remove;
    });
    void desktopClient
      .startTerminal()
      .then((id) => {
        if (disposed) return void desktopClient.closeTerminal(id);
        session.current = id;
        xterm.onData((data) => void desktopClient.writeTerminal(id, data));
      })
      .catch((reason) => {
        setError(String(reason));
        xterm.writeln("Terminal could not start.");
      });
    return () => {
      disposed = true;
      removeListener?.();
      if (session.current) void desktopClient.closeTerminal(session.current);
      xterm.dispose();
    };
  }, [theme]);

  return (
    <section className="terminal">
      <div className="terminal-tabs">
        <span>
          <TerminalSquare size={14} /> PowerShell
        </span>
        <span className="terminal-path">{error ?? workspace.path}</span>
        <button aria-label="Clear terminal" onClick={() => terminal.current?.clear()} type="button">
          <Trash2 size={13} />
        </button>
      </div>
      <div className="terminal-host" ref={host} />
    </section>
  );
}
