import { ChevronDown, ChevronRight, FileCode2, Folder, FolderOpen } from "lucide-react";
import { useState } from "react";
import type { FileEntry } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";

export function FileTree({
  entries,
  onSelect,
  selectedPath
}: {
  entries: FileEntry[];
  onSelect: (path: string) => void;
  selectedPath: string | undefined;
}) {
  return (
    <div className="tree-nodes">
      {entries.map((entry) => (
        <FileNode entry={entry} key={entry.path} onSelect={onSelect} selectedPath={selectedPath} />
      ))}
    </div>
  );
}

function FileNode({
  entry,
  onSelect,
  selectedPath
}: {
  entry: FileEntry;
  onSelect: (path: string) => void;
  selectedPath: string | undefined;
}) {
  const [children, setChildren] = useState<FileEntry[]>();
  const [expanded, setExpanded] = useState(false);
  const directory = entry.kind === "directory";

  async function activate() {
    if (!directory) return onSelect(entry.path);
    const next = !expanded;
    setExpanded(next);
    if (next && !children) setChildren(await desktopClient.listFiles(entry.path));
  }

  const Disclosure = expanded ? ChevronDown : ChevronRight;
  const EntryIcon = directory ? (expanded ? FolderOpen : Folder) : FileCode2;
  return (
    <div className="tree-node">
      <button
        className={selectedPath === entry.path ? "tree-row selected" : "tree-row"}
        onClick={() => void activate()}
        type="button"
      >
        <span className="tree-disclosure">{directory ? <Disclosure size={13} /> : null}</span>
        <EntryIcon className="tree-entry-icon" size={14} />
        <span className="tree-label">{entry.name}</span>
      </button>
      {expanded && children ? (
        <div className="tree-children">
          <FileTree entries={children} onSelect={onSelect} selectedPath={selectedPath} />
        </div>
      ) : null}
    </div>
  );
}
