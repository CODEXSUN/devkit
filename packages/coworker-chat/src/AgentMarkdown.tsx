import { Check, Clipboard } from "lucide-react";
import { useState, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AgentMarkdown({ streaming, text }: { streaming: boolean; text: string }) {
  return (
    <div className="messenger-agent-markdown">
      <ReactMarkdown components={{ code: Code }} remarkPlugins={[remarkGfm]}>{text || "No response returned."}</ReactMarkdown>
      {streaming ? <i aria-hidden="true" className="messenger-agent-caret" /> : null}
    </div>
  );
}

function Code({ children, className, ...props }: ComponentPropsWithoutRef<"code">) {
  const [copied, setCopied] = useState(false);
  const text = String(children).replace(/\n$/u, "");
  const block = Boolean(className) || text.includes("\n");
  if (!block) return <code className={className} {...props}>{children}</code>;
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }
  return (
    <span className="messenger-agent-code">
      <button aria-label="Copy code" onClick={() => void copy()} title={copied ? "Copied" : "Copy code"} type="button">{copied ? <Check size={13} /> : <Clipboard size={13} />}</button>
      <code className={className} {...props}>{children}</code>
    </span>
  );
}
