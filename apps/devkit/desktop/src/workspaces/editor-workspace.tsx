import Editor from "@monaco-editor/react";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { desktopClient } from "../services/desktop-client";

export function EditorWorkspace({ path }: { path: string | undefined }) {
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!path) return;
    void desktopClient
      .readFile(path)
      .then((value) => {
        setContent(value);
        setSaved(value);
        setError(undefined);
      })
      .catch((reason) => setError(String(reason)));
  }, [path]);

  if (!path)
    return (
      <section className="editor-welcome">
        <div className="brand-glyph">CL</div>
        <h1>CodeLogicX Desktop</h1>
        <p>Open a file from Explorer to start editing.</p>
      </section>
    );
  const dirty = content !== saved;
  async function save() {
    if (!path) return;
    try {
      await desktopClient.writeFile(path, content);
      setSaved(content);
      setError(undefined);
    } catch (reason) {
      setError(String(reason));
    }
  }
  return (
    <section className="editor">
      <header>
        <span>
          {dirty ? "● " : ""}
          {path}
        </span>
        <button disabled={!dirty} onClick={() => void save()} type="button">
          <Save size={14} /> Save
        </button>
      </header>
      {error ? <div className="inline-error">{error}</div> : null}
      <Editor
        height="100%"
        language={languageFor(path)}
        onChange={(value) => setContent(value ?? "")}
        options={{
          fontSize: 13,
          minimap: { enabled: false },
          padding: { top: 14 },
          scrollBeyondLastLine: false
        }}
        theme="vs-dark"
        value={content}
      />
    </section>
  );
}

function languageFor(path: string) {
  const extension = path.split(".").at(-1)?.toLowerCase();
  return (
    (
      {
        css: "css",
        html: "html",
        json: "json",
        md: "markdown",
        rs: "rust",
        ts: "typescript",
        tsx: "typescript"
      } as Record<string, string>
    )[extension ?? ""] ?? "plaintext"
  );
}
