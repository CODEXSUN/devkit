import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Bot, Check, Copy, FileCode2, FolderSearch, RefreshCcw, Send, ShieldCheck, Sparkles, TerminalSquare, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AgentMarkdown } from "./AgentMarkdown";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  model?: string;
}

interface ChatResponse {
  text: string;
  code_snippet?: string | null;
  model_used: string;
}

interface ChatDelta {
  requestId: string;
  delta: string;
}

interface ChatWorkspaceProps {
  activeFile: string;
  activeThreadId?: string;
  selectedModel?: string;
}

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "CodeIt is ready. Send a prompt to start a real OpenCode session.",
};

export function ChatWorkspace({
  activeFile,
  activeThreadId,
  selectedModel = "deepseek-v4-flash-free",
}: ChatWorkspaceProps) {
  const [composer, setComposer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [running, setRunning] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const pendingRequestId = useRef<string | null>(null);

  useEffect(() => {
    if (!activeThreadId || activeThreadId === "1") return;
    setError(null);
    setMessages([{ ...welcomeMessage, id: `welcome-${activeThreadId}` }]);
  }, [activeThreadId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, running]);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    let unlisten: UnlistenFn | undefined;
    void listen<ChatDelta>("codeit://chat-delta", (event) => {
      if (event.payload.requestId !== pendingRequestId.current) return;
      setMessages((current) => appendAssistantDelta(current, event.payload.delta));
    }).then((dispose) => {
      unlisten = dispose;
    });
    return () => unlisten?.();
  }, []);

  async function send() {
    const prompt = composer.trim();
    if (!prompt || running) return;

    const requestId = crypto.randomUUID();
    const previousReply = [...messages].reverse().find((message) => message.role === "assistant")?.text;
    pendingRequestId.current = requestId;
    setComposer("");
    setError(null);
    setRunning(true);
    setMessages((current) => [
      ...current,
      { id: requestId, role: "user", text: prompt },
      { id: `assistant-${requestId}`, role: "assistant", text: "" },
    ]);

    try {
      const response = await invoke<ChatResponse>("chat_query", {
        requestId,
        prompt,
        model: selectedModel,
        fileContext: activeFile,
        lastTopic: previousReply?.slice(0, 400) ?? null,
      });
      setMessages((current) => finalizeAssistantMessage(current, requestId, response));
    } catch (reason) {
      setMessages((current) => current.filter((message) => message.id !== `assistant-${requestId}`));
      setError(readError(reason));
    } finally {
      pendingRequestId.current = null;
      setRunning(false);
    }
  }

  return (
    <main className="codeit-agent-chat flex-1 flex flex-col h-full bg-background overflow-hidden">
      <section className="codeit-agent-transcript flex-1 overflow-y-auto" aria-live="polite">
        <div className="codeit-agent-content">
          {messages.length === 1 ? (
            <AgentWelcome onPrompt={setComposer} />
          ) : (
            messages.map((message) => <ChatBubble key={message.id} message={message} />)
          )}
          {running && <RunActivity />}
          {running && <ThinkingIndicator />}
          {error && <ErrorNotice message={error} />}
        </div>
        <div ref={endRef} />
      </section>

      <footer className="codeit-agent-composer-wrap shrink-0">
        <div className="codeit-agent-composer">
          <textarea
            aria-label="Ask CodeIt"
            className="codeit-agent-input"
            disabled={running}
            onChange={(event) => setComposer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder="Ask CodeIt to inspect, plan, write, or review…"
            value={composer}
          />
          <div className="codeit-composer-footer">
            <div className="codeit-composer-context"><FileCode2 size={14} /> {activeFile}</div>
            <span className="codeit-composer-hint">{running ? "Streaming response" : "Enter to send · Shift+Enter for a new line"}</span>
            <button
              aria-label="Send prompt"
              className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
              disabled={!composer.trim() || running}
              onClick={() => void send()}
              type="button"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  async function copy() {
    await navigator.clipboard.writeText(message.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <article className={`codeit-message ${isUser ? "user" : "agent"}`}>
      <div className={`codeit-message-avatar ${isUser ? "user" : "agent"}`}>
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>
      <div className="codeit-message-main">
        <div className="codeit-message-meta"><strong>{isUser ? "You" : "CodeIt"}</strong>{message.model && <span>{message.model}</span>}</div>
        <div className={`codeit-message-body ${isUser ? "user" : "agent"}`}>
          {isUser ? message.text : message.text ? <AgentMarkdown text={message.text} /> : "Thinking…"}
        </div>
        {message.text && (
          <button className="codeit-message-copy" onClick={() => void copy()} type="button">
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </article>
  );
}

function ThinkingIndicator() {
  return <div className="codeit-thinking"><RefreshCcw className="animate-spin" size={14} /> CodeIt is writing a response</div>;
}

function ErrorNotice({ message }: { message: string }) {
  return <div className="codeit-agent-error">{message}</div>;
}

function AgentWelcome({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  return <section className="codeit-agent-welcome">
    <div className="codeit-welcome-mark"><Sparkles size={22} /></div>
    <p className="codeit-welcome-eyebrow">AGENTIC CODING CHAT</p>
    <h1>What do you want to build?</h1>
    <p>CodeIt keeps the conversation focused, streams its work, and makes failures visible instead of inventing a result.</p>
    <div className="codeit-suggestion-grid">
      <Suggestion icon={<FolderSearch size={16} />} label="Explain this workspace" prompt="Explain the purpose and structure of this workspace." onPrompt={onPrompt} />
      <Suggestion icon={<TerminalSquare size={16} />} label="Design a feature" prompt="Create a concise technical plan for the next feature." onPrompt={onPrompt} />
      <Suggestion icon={<ShieldCheck size={16} />} label="Review a change" prompt="Review the active file and list the highest-risk changes to make." onPrompt={onPrompt} />
    </div>
  </section>
}

function Suggestion({ icon, label, onPrompt, prompt }: { icon: React.ReactNode; label: string; onPrompt: (prompt: string) => void; prompt: string }) {
  return <button className="codeit-suggestion" onClick={() => onPrompt(prompt)} type="button">{icon}<span>{label}</span></button>;
}

function RunActivity() {
  return <section className="codeit-run-activity">
    <div className="codeit-run-heading"><RefreshCcw className="animate-spin" size={14} /><span>Agent working</span><small>Live OpenCode stream</small></div>
    <div className="codeit-run-step complete"><Check size={13} /> Prepared active file context</div>
    <div className="codeit-run-step active"><RefreshCcw className="animate-spin" size={13} /> Requesting model response</div>
  </section>;
}

function appendAssistantDelta(messages: ChatMessage[], delta: string) {
  const next = [...messages];
  const message = next[next.length - 1];
  if (message?.role === "assistant") {
    next[next.length - 1] = { ...message, text: message.text + delta };
  }
  return next;
}

function finalizeAssistantMessage(messages: ChatMessage[], requestId: string, response: ChatResponse) {
  return messages.map((message) => message.id === `assistant-${requestId}` ? {
    ...message,
    text: response.text,
    model: response.model_used,
  } : message);
}

function readError(reason: unknown) {
  return reason instanceof Error ? reason.message : String(reason);
}

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
