import { ArrowLeft, Box, Check, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { CoworkerClient } from "./client";
import type { CoworkerProject, CoworkerProjectRecord } from "./types";
import { SchemaProperties, SchemaTableCard } from "./ProjectSchemaFields";

export type SchemaColumn = { id: string; name: string; nullable: boolean; primary: boolean; type: string };
export type ArchitectureNode = { columns?: SchemaColumn[]; description: string; id: string; kind: string; title: string; x: number; y: number };
export type ArchitectureEdge = { cardinality?: string; from: string; id: string; label?: string; to: string };
type ArchitectureGraph = { edges: ArchitectureEdge[]; nodes: ArchitectureNode[]; version: 1 };

export function ProjectArchitecturePlanner({ client, mode = "architecture", onBack, onSaved, project, record }: {
  client: CoworkerClient;
  onBack: () => void;
  onSaved: (record: CoworkerProjectRecord) => void;
  project: CoworkerProject;
  record: CoworkerProjectRecord;
  mode?: "architecture" | "schema";
}) {
  const parsed = useMemo(() => parseGraph(record.description), [record.description]);
  const [graph, setGraph] = useState(parsed ?? starterGraph(mode));
  const [name, setName] = useState(record.title || `New ${mode}`);
  const [status, setStatus] = useState(record.status || "planning");
  const [selectedId, setSelectedId] = useState(graph.nodes[0]?.id ?? "");
  const [connectionDraft, setConnectionDraft] = useState<{ from: string; x: number; y: number } | null>(null);
  const [connectionTarget, setConnectionTarget] = useState("");
  const [density, setDensity] = useState<"compact" | "comfortable">("comfortable");
  const [curve, setCurve] = useState<"curve" | "straight">("curve");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);
  const selected = graph.nodes.find((node) => node.id === selectedId);
  const creating = record.id.startsWith("draft:");

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError("");
    const payload = {
      description: JSON.stringify(graph),
      key: record.key || recordKey(name, mode),
      lane: `${mode}-canvas`,
      referenceId: project.id,
      referenceType: "project",
      status,
      title: name.trim(),
      type: mode
    };
    try {
      const saved = creating
        ? await client.createProjectRecord("discussion", payload)
        : await client.updateProjectRecord("discussion", record.id, payload);
      onSaved(saved);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `The ${mode} could not be saved.`);
    } finally {
      setSaving(false);
    }
  }

  function addNode() {
    const node: ArchitectureNode = mode === "schema"
      ? { columns: [newColumn("id", "uuid", true, false)], description: "", id: crypto.randomUUID(), kind: "table", title: "new_table", x: 180 + graph.nodes.length * 24, y: 120 + graph.nodes.length * 36 }
      : { description: "", id: crypto.randomUUID(), kind: "service", title: "New block", x: 180 + graph.nodes.length * 24, y: 120 + graph.nodes.length * 36 };
    setGraph((current) => ({ ...current, nodes: [...current.nodes, node] }));
    setSelectedId(node.id);
  }

  function selectNode(id: string) {
    setSelectedId(id);
  }

  function updateNode(input: Partial<ArchitectureNode>) {
    setGraph((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === selectedId ? { ...node, ...input } : node) }));
  }

  function removeNode() {
    if (!selectedId) return;
    setGraph((current) => ({ edges: current.edges.filter((edge) => edge.from !== selectedId && edge.to !== selectedId), nodes: current.nodes.filter((node) => node.id !== selectedId), version: 1 }));
    setSelectedId("");
    setConnectionDraft(null);
  }

  function beginDrag(event: React.PointerEvent, node: ArchitectureNode) {
    if ((event.target as HTMLElement).closest("button")) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startY = event.clientY;
    const move = (moveEvent: PointerEvent) => {
      const x = Math.max(8, Math.min(canvas.clientWidth - nodeWidth(mode) - 8, node.x + moveEvent.clientX - startX));
      const y = Math.max(8, Math.min(canvas.clientHeight - 76, node.y + moveEvent.clientY - startY));
      setGraph((current) => ({ ...current, nodes: current.nodes.map((entry) => entry.id === node.id ? { ...entry, x, y } : entry) }));
    };
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  function beginConnection(event: React.PointerEvent<HTMLButtonElement>, node: ArchitectureNode) {
    event.preventDefault();
    event.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const start = { x: node.x + nodeWidth(mode), y: node.y + nodeCenterY(node, density, mode) };
    setSelectedId(node.id);
    setConnectionDraft({ from: node.id, ...start });
    const move = (moveEvent: PointerEvent) => {
      setConnectionDraft({ from: node.id, x: moveEvent.clientX - rect.left, y: moveEvent.clientY - rect.top });
      const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest<HTMLElement>("[data-architecture-node]");
      setConnectionTarget(target?.dataset.architectureNode !== node.id ? target?.dataset.architectureNode ?? "" : "");
    };
    const stop = (upEvent: PointerEvent) => {
      const target = document.elementFromPoint(upEvent.clientX, upEvent.clientY)?.closest<HTMLElement>("[data-architecture-node]")?.dataset.architectureNode;
      if (target && target !== node.id) connectNodes(node.id, target);
      setConnectionDraft(null);
      setConnectionTarget("");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  function connectNodes(from: string, to: string) {
    setGraph((current) => current.edges.some((edge) => edge.from === from && edge.to === to)
      ? current
      : { ...current, edges: [...current.edges, { cardinality: "many-to-one", from, id: crypto.randomUUID(), label: "references", to }] });
    setSelectedId(to);
  }

  return (
    <section className={`architecture-planner ${density}${mode === "schema" ? " schema-planner" : ""}`}>
      <header className="architecture-planner-header">
        <button aria-label={`Back to ${mode}`} onClick={onBack} type="button"><ArrowLeft size={17} /></button>
        <input aria-label={`${mode} name`} onChange={(event) => setName(event.target.value)} value={name} />
        <span>{saving ? "Saving…" : "Planning"}</span>
        <button className="architecture-save" disabled={saving || !name.trim()} onClick={() => void save()} type="button"><Save size={15} /> Save {mode}</button>
      </header>
      <div className="architecture-workbench">
        <main className="architecture-canvas" ref={canvasRef}>
          <svg aria-hidden="true" className="architecture-wires">
            {graph.edges.map((edge) => {
              const from = graph.nodes.find((node) => node.id === edge.from);
              const to = graph.nodes.find((node) => node.id === edge.to);
              if (!from || !to) return null;
              const start = { x: from.x + nodeWidth(mode), y: from.y + nodeCenterY(from, density, mode) };
              const end = { x: to.x, y: to.y + nodeCenterY(to, density, mode) };
              return <g key={edge.id}><path d={edgePath(start, end, curve)} /><text x={(start.x + end.x) / 2} y={(start.y + end.y) / 2 - 7}>{mode === "schema" ? edge.label || "references" : ""}</text></g>;
            })}
            {connectionDraft ? <path className="draft" d={edgePath(connectionStart(graph, connectionDraft.from, density, mode), connectionDraft, curve)} /> : null}
          </svg>
          <button className="architecture-add-node" onClick={addNode} type="button"><Plus size={15} /> Add block</button>
          {graph.nodes.map((node) => (
            <article
              className={`${mode === "schema" ? "schema-node " : ""}${selectedId === node.id ? "selected" : ""}${connectionTarget === node.id ? " connection-target" : ""}`}
              data-architecture-node={node.id}
              key={node.id}
              onClick={() => selectNode(node.id)}
              onPointerDown={(event) => beginDrag(event, node)}
              style={{ left: node.x, top: node.y }}
            >
              {mode === "schema" ? <SchemaTableCard node={node} /> : <span><Box size={16} /><strong>{node.title}</strong></span>}
              <button aria-label={`Drag a connection from ${node.title}`} className="architecture-node-handle" onPointerDown={(event) => beginConnection(event, node)} title="Drag to another block" type="button"><Plus size={12} /></button>
            </article>
          ))}
          {connectionDraft ? <p className="architecture-connect-hint">Drag onto another block to connect</p> : null}
        </main>
        <aside className="architecture-properties">
          <header><div><strong>Properties</strong><small>{selected ? "Selected block" : "Canvas"}</small></div>{selected ? <Check size={16} /> : null}</header>
          {selected && mode === "schema" ? <SchemaProperties edges={graph.edges} node={selected} nodes={graph.nodes} onRemoveRelation={(id) => setGraph((current) => ({ ...current, edges: current.edges.filter((edge) => edge.id !== id) }))} onUpdate={updateNode} onUpdateRelation={(id, input) => setGraph((current) => ({ ...current, edges: current.edges.map((edge) => edge.id === id ? { ...edge, ...input } : edge) }))} /> : selected ? <>
            <label><span>Name</span><input onChange={(event) => updateNode({ title: event.target.value })} value={selected.title} /></label>
            <label><span>Type</span><select onChange={(event) => updateNode({ kind: event.target.value })} value={selected.kind}>{mode === "schema" ? <><option value="table">Table</option><option value="view">View</option><option value="enum">Enum</option><option value="external">External source</option></> : <><option value="input">Input</option><option value="service">Service</option><option value="database">Database</option><option value="queue">Queue</option><option value="output">Output</option></>}</select></label>
            <label><span>Description</span><textarea onChange={(event) => updateNode({ description: event.target.value })} placeholder="Purpose, responsibility, or constraint" rows={5} value={selected.description} /></label>
            <div className="architecture-position"><span>X <b>{Math.round(selected.x)}</b></span><span>Y <b>{Math.round(selected.y)}</b></span></div>
            <button className="architecture-delete" onClick={removeNode} type="button"><Trash2 size={15} /> Remove block</button>
          </> : <p>Select a block to edit its name, type, and planning notes.</p>}
          <div className="architecture-display-options">
            <span>Block spacing</span>
            <div><button className={density === "compact" ? "active" : ""} onClick={() => setDensity("compact")} type="button">Compact</button><button className={density === "comfortable" ? "active" : ""} onClick={() => setDensity("comfortable")} type="button">Comfortable</button></div>
          </div>
          <div className="architecture-display-options">
            <span>Connections</span>
            <div><button className={curve === "curve" ? "active" : ""} onClick={() => setCurve("curve")} type="button">Curved</button><button className={curve === "straight" ? "active" : ""} onClick={() => setCurve("straight")} type="button">Straight</button></div>
          </div>
          <label><span>{mode === "schema" ? "Review" : "Architecture"} status</span><select onChange={(event) => setStatus(event.target.value)} value={status}><option value="draft">Draft</option><option value="planning">Planning</option><option value="in-review">In review</option><option value="approved">Approved</option><option value="deprecated">Deprecated</option></select></label>
          {error ? <p className="architecture-error" role="alert">{error}</p> : null}
        </aside>
      </div>
    </section>
  );
}

export function architectureSummary(description: string) {
  const graph = parseGraph(description);
  return graph ? `${graph.nodes.length} blocks · ${graph.edges.length} connections` : description.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim();
}

function parseGraph(value: string): ArchitectureGraph | null {
  try {
    const parsed = JSON.parse(value) as Partial<ArchitectureGraph>;
    return parsed.version === 1 && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges) ? parsed as ArchitectureGraph : null;
  } catch { return null; }
}
function recordKey(value: string, mode: "architecture" | "schema") { return `${mode === "schema" ? "SCHEMA" : "ARCH"}-${value.trim().replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/gu, "").slice(0, 32).toUpperCase() || "NEW"}`; }
function edgePath(start: { x: number; y: number }, end: { x: number; y: number }, curve: "curve" | "straight") {
  if (curve === "straight") return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  const offset = Math.max(50, Math.abs(end.x - start.x) / 2);
  return `M ${start.x} ${start.y} C ${start.x + offset} ${start.y}, ${end.x - offset} ${end.y}, ${end.x} ${end.y}`;
}
function nodeCenterY(node: ArchitectureNode, density: "compact" | "comfortable", mode: "architecture" | "schema") { return mode === "schema" ? (44 + (node.columns?.length ?? 0) * 24) / 2 : density === "compact" ? 27 : 34; }
function nodeWidth(mode: "architecture" | "schema") { return mode === "schema" ? 240 : 180; }
function connectionStart(graph: ArchitectureGraph, from: string, density: "compact" | "comfortable", mode: "architecture" | "schema") {
  const node = graph.nodes.find((entry) => entry.id === from);
  return node ? { x: node.x + nodeWidth(mode), y: node.y + nodeCenterY(node, density, mode) } : { x: 0, y: 0 };
}
function starterGraph(mode: "architecture" | "schema"): ArchitectureGraph {
  return mode === "schema"
    ? { edges: [], nodes: [{ columns: [newColumn("id", "uuid", true, false), newColumn("created_at", "timestamp", false, false)], description: "Primary project data", id: crypto.randomUUID(), kind: "table", title: "primary_table", x: 100, y: 100 }], version: 1 }
    : { edges: [], nodes: [{ description: "Entry point or source", id: crypto.randomUUID(), kind: "input", title: "Input", x: 90, y: 90 }, { description: "Primary application process", id: crypto.randomUUID(), kind: "service", title: "Process", x: 350, y: 190 }], version: 1 };
}
function newColumn(name: string, type: string, primary: boolean, nullable: boolean): SchemaColumn { return { id: crypto.randomUUID(), name, nullable, primary, type }; }
