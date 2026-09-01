import { ArrowLeft, Boxes, PanelRightClose, PanelRightOpen, RotateCcw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { WorkspaceEditor } from "@codexsun/ui/workspace";
import type { CoworkerClient } from "./client";
import type { CoworkerRegistryGroup, CoworkerRegistryModule } from "./types";

type SaveState = "idle" | "saving" | "saved" | "error";

export function ProjectModuleEditor({ client, groups, module, modules, onBack, onSaved }: {
  client: CoworkerClient;
  groups: CoworkerRegistryGroup[];
  module: CoworkerRegistryModule;
  modules: CoworkerRegistryModule[];
  onBack: () => void;
  onSaved: (module: CoworkerRegistryModule) => void;
}) {
  const [draft, setDraft] = useState(module);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  useEffect(() => { setDraft(module); setSaveState("idle"); setError(""); }, [module]);

  async function save() {
    if (!draft.name.trim() || !draft.key.trim() || !draft.groupId) { setError("Name, key, and group are required."); return; }
    setSaveState("saving"); setError("");
    try {
      const payload = {
        active: draft.active, description: draft.description, groupId: draft.groupId,
        key: draft.key.trim(), moduleType: draft.moduleType, name: draft.name.trim(),
        parentModuleId: draft.parentModuleId, routePath: draft.routePath,
        sortOrder: draft.sortOrder, status: draft.status
      };
      const saved = draft.id.startsWith("draft:")
        ? await client.createRegistryModule(payload)
        : await client.updateRegistryModule(draft.id, payload);
      setDraft((current) => ({ ...current, ...saved, children: current.children }));
      setSaveState("saved"); onSaved({ ...draft, ...saved, children: draft.children });
    } catch (reason) { setSaveState("error"); setError(reason instanceof Error ? reason.message : "The module could not be saved."); }
  }

  return <section className={`project-idea-editor project-module-editor${drawerOpen ? " drawer-open" : ""}`}>
    <header>
      <button aria-label="Back to modules" onClick={onBack} title="Back to modules" type="button"><ArrowLeft size={17} /></button>
      <strong>{draft.name || "Untitled module"}</strong>
      <div><button aria-label="Registry module" title="Registry module" type="button"><Boxes size={16} /></button><button aria-expanded={drawerOpen} aria-label={drawerOpen ? "Collapse properties" : "Open properties"} onClick={() => setDrawerOpen((open) => !open)} type="button">{drawerOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}</button><button className="idea-discard-button" disabled={saveState === "saving"} onClick={onBack} type="button"><RotateCcw size={14} /> Discard</button><button className={`idea-save-button ${saveState}`} disabled={saveState === "saving"} onClick={() => void save()} type="button"><i aria-hidden="true" />{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save"}</button></div>
    </header>
    <main>
      <input aria-label="Module name" autoFocus onChange={(event) => update({ name: event.target.value })} placeholder="Module name" value={draft.name} />
      <WorkspaceEditor className="project-module-description" content={draft.description} fullPreview onChange={(description) => update({ description })} placeholder="Describe this module, its responsibility, and its boundaries…" />
      {error ? <p role="alert">{error}</p> : null}
    </main>
    <aside aria-hidden={!drawerOpen}>
      <button aria-label="Collapse properties" onClick={() => setDrawerOpen(false)} type="button"><PanelRightClose size={17} /></button>
      <ModuleField label="Key"><input aria-label="Module key" onChange={(event) => update({ key: event.target.value })} value={draft.key} /></ModuleField>
      <ModuleField label="Status"><input aria-label="Module status" onChange={(event) => update({ status: event.target.value })} value={draft.status} /></ModuleField>
      <ModuleField label="Type"><select aria-label="Module type" onChange={(event) => update({ moduleType: event.target.value as CoworkerRegistryModule["moduleType"] })} value={draft.moduleType}><option value="area">Area</option><option value="module">Module</option><option value="page">Page</option></select></ModuleField>
      <ModuleField label="Group"><select aria-label="Module group" onChange={(event) => update({ groupId: event.target.value, parentModuleId: "" })} value={draft.groupId}>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></ModuleField>
      <ModuleField label="Parent module"><select aria-label="Parent module" onChange={(event) => update({ parentModuleId: event.target.value })} value={draft.parentModuleId}><option value="">None</option>{modules.filter((entry) => entry.id !== draft.id && entry.groupId === draft.groupId).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></ModuleField>
      <ModuleField label="Route"><input aria-label="Module route" onChange={(event) => update({ routePath: event.target.value })} placeholder="/app/devkit/..." value={draft.routePath} /></ModuleField>
      <ModuleField label="Sort order"><input aria-label="Module sort order" min="0" onChange={(event) => update({ sortOrder: Number(event.target.value) || 0 })} type="number" value={draft.sortOrder} /></ModuleField>
      <ModuleField label="Visibility"><select aria-label="Module visibility" onChange={(event) => update({ active: event.target.value === "active" })} value={draft.active ? "active" : "inactive"}><option value="active">Active</option><option value="inactive">Inactive</option></select></ModuleField>
    </aside>
  </section>;

  function update(change: Partial<CoworkerRegistryModule>) { setDraft((current) => ({ ...current, ...change })); setSaveState("idle"); }
}

function ModuleField({ children, label }: { children: ReactNode; label: string }) { return <label className="project-idea-field"><span>{label}</span>{children}</label>; }
