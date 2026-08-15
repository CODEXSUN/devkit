import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { LocalTask } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";

export function TasksPanel() {
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [title, setTitle] = useState("");
  useEffect(() => {
    void desktopClient.listTasks().then(setTasks);
  }, []);
  async function add() {
    const task = await desktopClient.saveTask(title.trim());
    setTasks((current) => [task, ...current]);
    setTitle("");
  }
  return (
    <div className="tasks-panel">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (title.trim()) void add();
        }}
      >
        <input
          aria-label="New local task"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a local task"
          value={title}
        />
        <button disabled={!title.trim()} type="submit">
          <Plus size={14} />
        </button>
      </form>
      {tasks.map((task) => (
        <div className="task-row" key={task.id}>
          <i data-status={task.status} />
          <span>{task.title}</span>
        </div>
      ))}
    </div>
  );
}
