import { KeyRound, Plus, Trash2 } from "lucide-react";
import type { ArchitectureEdge, ArchitectureNode, SchemaColumn } from "./ProjectArchitecturePlanner";

export function SchemaTableCard({ node }: { node: ArchitectureNode }) {
  return <div className="schema-table-card">
    <header><strong>{node.title}</strong><small>{node.kind}</small></header>
    <div>{(node.columns ?? []).map((column) => <span key={column.id}>{column.primary ? <KeyRound size={11} /> : <i />}<b>{column.name || "unnamed"}</b><small>{column.type}{column.nullable ? " ?" : ""}</small></span>)}</div>
  </div>;
}

export function SchemaProperties({ edges, node, nodes, onRemoveRelation, onUpdate, onUpdateRelation }: {
  edges: ArchitectureEdge[];
  node: ArchitectureNode;
  nodes: ArchitectureNode[];
  onRemoveRelation: (id: string) => void;
  onUpdate: (input: Partial<ArchitectureNode>) => void;
  onUpdateRelation: (id: string, input: Partial<ArchitectureEdge>) => void;
}) {
  const relations = edges.filter((edge) => edge.from === node.id || edge.to === node.id);
  function updateColumn(id: string, input: Partial<SchemaColumn>) { onUpdate({ columns: (node.columns ?? []).map((column) => column.id === id ? { ...column, ...input } : column) }); }
  function addColumn() { onUpdate({ columns: [...(node.columns ?? []), { id: crypto.randomUUID(), name: "new_column", nullable: true, primary: false, type: "varchar" }] }); }
  function removeColumn(id: string) { onUpdate({ columns: (node.columns ?? []).filter((column) => column.id !== id) }); }
  return <>
    <label><span>Table name</span><input onChange={(event) => onUpdate({ title: event.target.value })} value={node.title} /></label>
    <label><span>Table type</span><select onChange={(event) => onUpdate({ kind: event.target.value })} value={node.kind}><option value="table">Table</option><option value="view">View</option><option value="enum">Enum</option><option value="external">External source</option></select></label>
    <section className="schema-column-editor">
      <header><strong>Columns</strong><button onClick={addColumn} type="button"><Plus size={13} /> Add</button></header>
      <div className="schema-column-head"><span>Name</span><span>Type</span><span>PK</span><span>Null</span><span /></div>
      {(node.columns ?? []).map((column) => <div className="schema-column-row" key={column.id}>
        <input aria-label="Column name" onChange={(event) => updateColumn(column.id, { name: event.target.value })} value={column.name} />
        <select aria-label={`${column.name} data type`} onChange={(event) => updateColumn(column.id, { type: event.target.value })} value={column.type}>{["uuid", "varchar", "text", "integer", "decimal", "boolean", "date", "timestamp", "json"].map((type) => <option key={type} value={type}>{type}</option>)}</select>
        <input aria-label={`${column.name} primary key`} checked={column.primary} onChange={(event) => updateColumn(column.id, { primary: event.target.checked })} type="checkbox" />
        <input aria-label={`${column.name} nullable`} checked={column.nullable} onChange={(event) => updateColumn(column.id, { nullable: event.target.checked })} type="checkbox" />
        <button aria-label={`Remove ${column.name}`} onClick={() => removeColumn(column.id)} type="button"><Trash2 size={13} /></button>
      </div>)}
    </section>
    <label><span>Planning notes</span><textarea onChange={(event) => onUpdate({ description: event.target.value })} placeholder="Purpose and constraints" rows={3} value={node.description} /></label>
    <section className="schema-relations">
      <header><strong>Relations</strong><small>Drag + between tables</small></header>
      {relations.length ? relations.map((edge) => {
        const other = nodes.find((candidate) => candidate.id === (edge.from === node.id ? edge.to : edge.from));
        return <div key={edge.id}><strong>{other?.title ?? "Unknown table"}</strong><input aria-label="Relation label" onChange={(event) => onUpdateRelation(edge.id, { label: event.target.value })} value={edge.label ?? "references"} /><select aria-label="Relation cardinality" onChange={(event) => onUpdateRelation(edge.id, { cardinality: event.target.value })} value={edge.cardinality ?? "many-to-one"}><option value="one-to-one">1 : 1</option><option value="one-to-many">1 : N</option><option value="many-to-one">N : 1</option><option value="many-to-many">N : N</option></select><button aria-label={`Remove relation with ${other?.title ?? "table"}`} onClick={() => onRemoveRelation(edge.id)} type="button"><Trash2 size={13} /></button></div>;
      }) : <p>No relations yet.</p>}
    </section>
  </>;
}
