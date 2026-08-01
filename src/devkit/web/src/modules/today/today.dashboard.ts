import type {
  TodayDashboard,
  TodayGithubDashboard,
  TodayProjectManagerResult,
  TodayRecord,
} from "./today.types";

const completedStatuses = new Set([
  "approved",
  "completed",
  "done",
  "released",
]);
const waitingReviewStatuses = new Set([
  "in-review",
  "needs-review",
  "pending",
  "requested",
]);
const failedStatuses = new Set(["broken", "error", "failed"]);
const checkTerms = /\b(build|check|ci|test|typecheck)\b/iu;

export function buildTodayDashboard(
  projectManager: TodayProjectManagerResult,
  repositories: TodayGithubDashboard,
  now = new Date(),
): TodayDashboard {
  const today = localDate(now);
  const activeTasks = projectManager.records.task.filter(isOpen);
  return {
    blockedIssues: projectManager.records.issue
      .filter(
        (record) =>
          isOpen(record) && ["blocked", "on-hold"].includes(record.status),
      )
      .sort(byPriorityThenDate),
    changedRepositories: repositories.projects
      .filter((repository) => repository.changedFiles > 0)
      .sort((left, right) => right.changedFiles - left.changedFiles),
    dueTodayTasks: activeTasks
      .filter((record) => record.dueDate === today)
      .sort(byPriorityThenDate),
    failedChecks: Object.values(projectManager.records)
      .flat()
      .filter(
        (record) =>
          record.active &&
          failedStatuses.has(record.status.toLowerCase()) &&
          checkTerms.test(`${record.type} ${record.title}`),
      )
      .sort(byPriorityThenDate),
    generatedAt: new Date().toISOString(),
    overdueTasks: activeTasks
      .filter((record) => record.dueDate && record.dueDate < today)
      .sort(byPriorityThenDate),
    repositorySync: repositories.projects
      .filter(
        (repository) =>
          (repository.ahead ?? 0) > 0 || (repository.behind ?? 0) > 0,
      )
      .sort(
        (left, right) =>
          (right.ahead ?? 0) +
          (right.behind ?? 0) -
          (left.ahead ?? 0) -
          (left.behind ?? 0),
      ),
    upcomingReleases: projectManager.records.release
      .filter(
        (record) =>
          isOpen(record) && Boolean(record.dueDate) && record.dueDate >= today,
      )
      .sort(byDate),
    waitingReviews: projectManager.records.review
      .filter(
        (record) =>
          record.active &&
          waitingReviewStatuses.has(record.status.toLowerCase()),
      )
      .sort(byPriorityThenDate),
  };
}

function isOpen(record: TodayRecord) {
  return record.active && !completedStatuses.has(record.status.toLowerCase());
}

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function byDate(left: TodayRecord, right: TodayRecord) {
  return left.dueDate.localeCompare(right.dueDate);
}

function byPriorityThenDate(left: TodayRecord, right: TodayRecord) {
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  return (
    order[left.priority] - order[right.priority] ||
    (left.dueDate || "9999").localeCompare(right.dueDate || "9999")
  );
}
