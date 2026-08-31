import { CheckSquare, ClipboardCheck, LoaderCircle, Plus, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { parseAgentStructuredPlan } from "./agent-structured-plan";

export function AgentStructuredPlanCard({
  busy,
  onCreateTasks,
  text
}: {
  busy: boolean;
  onCreateTasks: (tasks: string[], acceptance: string[], tests: string[]) => Promise<boolean>;
  text: string;
}) {
  const plan = useMemo(() => parseAgentStructuredPlan(text), [text]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [created, setCreated] = useState(false);

  if (!plan) return null;
  const structuredPlan = plan;
  const selectedTasks = structuredPlan.tasks.filter((task) => selected.has(task));

  async function createTasks() {
    if (await onCreateTasks(selectedTasks, structuredPlan.acceptance, structuredPlan.tests)) setCreated(true);
  }

  return (
    <section className="agent-structured-plan" aria-label="Implementation plan">
      <header><ClipboardCheck size={15} /><strong>Reviewed implementation plan</strong></header>
      {structuredPlan.proposal.length ? <p>{structuredPlan.proposal[0]}</p> : null}
      {structuredPlan.assumptions.length || structuredPlan.risks.length ? (
        <div className="agent-plan-summary">
          {structuredPlan.assumptions.length ? <span><b>Assumptions</b>{structuredPlan.assumptions.length}</span> : null}
          {structuredPlan.risks.length ? <span><b>Risks</b>{structuredPlan.risks.length}</span> : null}
          {structuredPlan.tests.length ? <span><b>Tests</b>{structuredPlan.tests.length}</span> : null}
        </div>
      ) : null}
      <div className="agent-plan-tasks">
        {structuredPlan.tasks.map((task) => (
          <label key={task}>
            <input
              checked={selected.has(task)}
              disabled={busy || created}
              onChange={() => setSelected((current) => toggleTask(current, task))}
              type="checkbox"
            />
            <span>{task}</span>
          </label>
        ))}
      </div>
      <footer>
        {created ? <span className="agent-plan-created"><ShieldCheck size={14} />Tasks created from this conversation</span> : (
          <button disabled={!selectedTasks.length || busy} onClick={() => void createTasks()} type="button">
            {busy ? <LoaderCircle className="spin" size={14} /> : <Plus size={14} />}
            Create {selectedTasks.length || "selected"} tasks
          </button>
        )}
        <small><CheckSquare size={13} />You choose the tasks before they are created.</small>
      </footer>
    </section>
  );
}

function toggleTask(tasks: Set<string>, task: string) {
  const next = new Set(tasks);
  if (next.has(task)) next.delete(task);
  else next.add(task);
  return next;
}
