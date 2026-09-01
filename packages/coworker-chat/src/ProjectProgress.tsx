import type { CoworkerProject, CoworkerProjectRecord } from "./types";

export function ProjectProgress({ compact = false, value }: { compact?: boolean; value: number }) {
  const progress = Math.max(0, Math.min(100, value));
  const size = compact ? 42 : 50;
  const radius = compact ? 16 : 19;
  const strokeWidth = compact ? 4 : 5;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  return (
    <span aria-label={`${progress}% complete`} className={`project-progress-circle${compact ? " compact" : ""}`} role="img">
      <svg aria-hidden="true" viewBox={`0 0 ${size} ${size}`}>
        <circle className="track" cx={center} cy={center} fill="none" r={radius} strokeWidth={strokeWidth} />
        <circle className="value" cx={center} cy={center} fill="none" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress / 100)} strokeLinecap="round" strokeWidth={strokeWidth} />
      </svg>
      <strong>{progress}%</strong>
    </span>
  );
}

export function projectProgress(project: CoworkerProject, records: CoworkerProjectRecord[]) {
  const work = records.filter((record) => record.kind !== "discussion");
  if (!work.length) return statusProgress(project.status || "");
  const completed = work.filter((record) => isCompleted(record.status)).length;
  return Math.round((completed / work.length) * 100);
}

export function belongsToProgressProject(record: CoworkerProjectRecord, project: CoworkerProject) {
  return record.referenceId === project.id || record.referenceId === project.key;
}

function isCompleted(status: string) {
  return ["approved", "completed", "done", "released"].includes(status.toLowerCase());
}

function statusProgress(status: string) {
  if (isCompleted(status)) return 100;
  if (status === "in-progress" || status === "active") return 40;
  return 0;
}
