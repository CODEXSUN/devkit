import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AgentMarkdown({ text }: { text: string }) {
  return (
    <div className="codeit-markdown">
      <ReactMarkdown
        components={{
          a: ({ node: _node, ...props }) => <a {...props} rel="noreferrer" target="_blank" />,
          code: ({ children, className, node: _node, ...props }) => {
            const isBlock = className?.startsWith("language-");
            return isBlock ? (
              <code className={className} {...props}>{children}</code>
            ) : (
              <code {...props}>{children}</code>
            );
          },
          input: ({ node: _node, ...props }) => <input {...props} disabled />,
          pre: ({ node: _node, ...props }) => <pre {...props} />,
          table: ({ node: _node, ...props }) => <div className="codeit-markdown-table"><table {...props} /></div>,
        }}
        remarkPlugins={[remarkGfm]}
        skipHtml
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
