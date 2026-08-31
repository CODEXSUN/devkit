import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

export type AgentFlowPreferencesValue = {
  evidenceExpanded: boolean;
  reducedMotion: boolean;
};

export function AgentFlowPreferences({
  onChange,
  value
}: {
  onChange: (value: AgentFlowPreferencesValue) => void;
  value: AgentFlowPreferencesValue;
}) {
  const [open, setOpen] = useState(false);
  return (
    <aside className="agent-flow-preferences">
      {open ? (
        <section aria-label="Agent flow preferences">
          <header><strong>Agent flow</strong><button aria-label="Close agent flow preferences" onClick={() => setOpen(false)} type="button"><X size={14} /></button></header>
          <label><span><b>Activity</b><small>Show tool evidence as it happens</small></span><input checked={value.evidenceExpanded} onChange={(event) => onChange({ ...value, evidenceExpanded: event.target.checked })} type="checkbox" /></label>
          <label><span><b>Motion</b><small>Use subtle response animation</small></span><input checked={!value.reducedMotion} onChange={(event) => onChange({ ...value, reducedMotion: !event.target.checked })} type="checkbox" /></label>
        </section>
      ) : (
        <button aria-label="Tune agent flow" onClick={() => setOpen(true)} title="Agent flow" type="button"><SlidersHorizontal size={15} /></button>
      )}
    </aside>
  );
}
