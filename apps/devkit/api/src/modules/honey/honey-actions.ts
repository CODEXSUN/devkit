export type HoneyAction = {
  href?: string;
  id: "explain-error" | "open-project" | "review-deployment" | "start-agent" | "view-task";
  label: string;
  prompt?: string;
};

const actions: Record<HoneyAction["id"], HoneyAction> = {
  "explain-error": {
    id: "explain-error",
    label: "Explain an error",
    prompt: "Help me understand this error and suggest the safest next step: "
  },
  "open-project": { href: "/app/devkit/projects", id: "open-project", label: "Open project" },
  "review-deployment": {
    href: "/app/devkit/orchestration",
    id: "review-deployment",
    label: "Review deployment"
  },
  "start-agent": { href: "/app/devkit/agent-ide", id: "start-agent", label: "Start Project Agent" },
  "view-task": { href: "/app/devkit/tasks", id: "view-task", label: "View task" }
};

export function resolveHoneyActions(request: string): HoneyAction[] {
  const ids: HoneyAction["id"][] = [];
  if (/\b(?:error|failed|failure|exception|broken|issue|troubleshoot)\b/iu.test(request)) ids.push("explain-error");
  if (/\b(?:deploy|deployment|production|release|rollback|hostinger)\b/iu.test(request)) ids.push("review-deployment");
  if (/\b(?:task|todo|work item|next step)\b/iu.test(request)) ids.push("view-task");
  if (/\b(?:project|repository|workspace|roadmap)\b/iu.test(request)) ids.push("open-project");
  ids.push("start-agent", "open-project", "view-task");
  return [...new Set(ids)].slice(0, 3).map((id) => actions[id]);
}
