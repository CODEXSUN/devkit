import { Lightbulb, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { WorkspaceLookup, type WorkspaceLookupOption } from "@codexsun/ui/workspace";
import type { CoworkerClient } from "./client";
import { ProjectIdeaEditor } from "./ProjectIdeaEditor";
import type { CoworkerProjectRecord } from "./types";

const categories = ["all", "general", "product", "engineering", "design", "research"];

export function IdeasWorkspace({ client }: { client: CoworkerClient }) {
  const [ideas, setIdeas] = useState<CoworkerProjectRecord[]>([]);
  const [editing, setEditing] = useState<CoworkerProjectRecord | null>(null);
  const [filter, setFilter] = useState("all");
  const [density, setDensity] = useState<"compact" | "relaxed">("compact");
  const options = useMemo<WorkspaceLookupOption[]>(
    () => categories.map((value) => ({ label: value === "all" ? "All ideas" : label(value), value })),
    []
  );
  const visible = useMemo(
    () => ideas.filter((idea) => !idea.referenceId).filter((idea) => filter === "all" || idea.type === filter),
    [filter, ideas]
  );

  useEffect(() => {
    void client.projectRecords("discussion").then(setIdeas).catch(() => setIdeas([]));
  }, [client]);

  if (editing) {
    return <ProjectIdeaEditor client={client} idea={editing} onBack={() => setEditing(null)} onSaved={(saved) => {
      setIdeas((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setEditing(null);
    }} />;
  }

  return <section className={`ideas-workspace ideas-${density}`}>
    <div className="ideas-toolbar">
      <WorkspaceLookup
        allowTextValue={false}
        className="ideas-filter-lookup"
        clearable={false}
        compactOptions
        dropdownClassName="ideas-filter-options"
        dropdownMinWidth={280}
        emptyLabel="No idea category found."
        options={options}
        placeholder="Filter ideas"
        showAllOptionsOnFocus
        value={filter}
        onValueChange={setFilter}
      />
      <button onClick={() => setEditing(newIdea())} type="button"><Plus size={16} /> New idea</button>
    </div>
    {visible.length ? <div className="ideas-list">{visible.map((idea) => <button key={idea.id} onClick={() => setEditing(idea)} type="button"><span><Lightbulb size={18} /></span><div><strong>{idea.title}</strong><p>{plainText(idea.description) || "No short description provided."}</p><small>{label(idea.type || "general")} · {hashtags(idea.description).map((tag) => `#${tag}`).join(" ")}</small></div><em>{label(idea.status || "open")}</em></button>)}</div> : <div className="ideas-empty"><Lightbulb size={24} /><strong>No matching ideas</strong><p>Start the first global discussion, or choose another filter.</p></div>}
    <div className="ideas-tweak-panel" aria-label="Ideas display settings"><span>Density</span><button aria-pressed={density === "compact"} onClick={() => setDensity("compact")} type="button">Compact</button><button aria-pressed={density === "relaxed"} onClick={() => setDensity("relaxed")} type="button">Relaxed</button></div>
  </section>;
}

function newIdea(): CoworkerProjectRecord { return { description: "", id: `draft:${crypto.randomUUID()}`, key: "", kind: "discussion", lane: "", referenceId: "", referenceType: "", status: "open", title: "", type: "general" }; }
function hashtags(value: string) { return [...new Set([...value.matchAll(/#([a-z0-9-]{2,48})/giu)].map((match) => match[1]!.toLowerCase()))]; }
function label(value: string) { return value.replaceAll("-", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase()); }
function plainText(value: string) { return value.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim(); }
