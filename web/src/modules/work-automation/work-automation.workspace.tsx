import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArchiveRestoreIcon,
  ArrowLeftIcon,
  BanIcon,
  ChartNoAxesGanttIcon,
  ChevronRightIcon,
  ListTreeIcon,
  MapIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { Input } from "@codexsun/ui/components/input";
import { WorkspaceDatePicker } from "@codexsun/ui/workspace/date-picker";
import { WorkspaceFilters } from "@codexsun/ui/workspace/filters";
import {
  WorkspaceLookup,
  type WorkspaceLookupOption,
} from "@codexsun/ui/workspace/lookup";
import { WorkspaceMinimalEditor } from "@codexsun/ui/workspace/minimal-editor";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { WorkspacePagination } from "@codexsun/ui/workspace/pagination";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { WorkspaceSelect } from "@codexsun/ui/workspace/select";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableHeaderCell,
  WorkspaceTablePanel,
} from "@codexsun/ui/workspace/table";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceUpsertDialog,
} from "@codexsun/ui/workspace/upsert";
import { buildShowingLabel } from "@codexsun/ui/workspace/utils";
import {
  useProjectManagerMutations,
  useProjectManagerRecordsQuery,
} from "../project-manager/project-manager.hooks";
import { ProjectManagerAttachments } from "../project-manager/project-manager.attachments";
import {
  formFromRecord,
  payloadFromForm,
} from "../project-manager/project-manager.schema";
import {
  deleteProjectManagerAttachment,
  uploadProjectManagerAttachment,
} from "../project-manager/project-manager.services";
import type {
  ProjectManagerAttachment,
  ProjectManagerForm,
  ProjectManagerRecord,
} from "../project-manager/project-manager.types";
import {
  RoadmapStatistics,
  WorkAutomationWorkflow,
  type WorkflowRecords,
  type WorkflowView,
} from "./work-automation.workflow";

const issueStatusOptions = [
  "open",
  "in-progress",
  "needs-review",
  "blocked",
  "completed",
];
const projectStatusOptions = [
  "planning",
  "approved",
  "in-progress",
  "on-hold",
  "blocked",
  "completed",
];
const taskStatusOptions = [
  "open",
  "assigned",
  "in-progress",
  "blocked",
  "completed",
];
const activityStatusOptions = ["open", "active", "in-progress", "completed"];
const reviewStatusOptions = [
  "requested",
  "in-review",
  "changes-requested",
  "approved",
];
const issueTypeOptions = ["bug", "enhancement", "feature", "support"];
const projectTypeOptions = [
  "product",
  "client",
  "internal",
  "research",
  "maintenance",
];
const taskTypeOptions = [
  "implementation",
  "development",
  "testing",
  "documentation",
];
const activityTypeOptions = ["work", "update", "meeting", "milestone"];
const reviewTypeOptions = ["code-review", "ui-review", "qa-review", "approval"];
const priorityOptions = ["low", "medium", "high", "critical"];
const roadmapStageOptions = [
  "discovery",
  "planning",
  "execution",
  "validation",
  "release",
];
const flow = ["project", "issue", "task", "activity", "review"] as const;
type FlowKind = (typeof flow)[number];
type DeliveryStage = Exclude<FlowKind, "project"> | "roadmap" | "gantt";

export function WorkAutomationWorkspace({
  initialView = "automation",
}: {
  initialView?: WorkflowView;
}) {
  const workflowOnly = initialView !== "automation";
  const projectQuery = useProjectManagerRecordsQuery("project");
  const query = useProjectManagerRecordsQuery("issue");
  const taskQuery = useProjectManagerRecordsQuery("task");
  const activityQuery = useProjectManagerRecordsQuery("activity");
  const reviewQuery = useProjectManagerRecordsQuery("review");
  const projectMutations = useProjectManagerMutations("project");
  const issueMutations = useProjectManagerMutations("issue");
  const taskMutations = useProjectManagerMutations("task");
  const activityMutations = useProjectManagerMutations("activity");
  const reviewMutations = useProjectManagerMutations("review");
  const [path, setPath] = useState<ProjectManagerRecord[]>([]);
  const [forcedKind, setForcedKind] = useState<FlowKind | null>(null);
  const [editing, setEditing] = useState<ProjectManagerForm | null>(null);
  const [editingKind, setEditingKind] = useState<FlowKind | null>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [saveError, setSaveError] = useState("");
  const [workflowView, setWorkflowView] = useState<WorkflowView>(() =>
    initialWorkflowView(initialView),
  );
  const [workflowKindFilter, setWorkflowKindFilter] = useState<
    "all" | FlowKind
  >("all");
  const [selectedWorkflowRecord, setSelectedWorkflowRecord] = useState("");
  const openedRecord = useRef("");
  const [createdOptions, setCreatedOptions] = useState<
    Record<LookupKind, WorkspaceLookupOption[]>
  >({ assignee: [], status: [], type: [] });
  const level = Math.min(path.length, flow.length - 1);
  const kind: FlowKind = forcedKind ?? flow[level] ?? "review";
  const nextKind: FlowKind | null = flow[level + 1] ?? null;
  const parent = path.at(-1) ?? null;
  const rootProject = path.find((record) => record.kind === "project") ?? null;
  const rootIssue = path.find((record) => record.kind === "issue") ?? null;
  const queries = {
    activity: activityQuery,
    issue: query,
    project: projectQuery,
    review: reviewQuery,
    task: taskQuery,
  };
  const mutationSets = {
    activity: activityMutations,
    issue: issueMutations,
    project: projectMutations,
    review: reviewMutations,
    task: taskMutations,
  };
  const mutations = mutationSets[kind];
  const records = parent
    ? (queries[kind].data ?? []).filter((record) => belongsTo(record, parent))
    : forcedKind
      ? (queries[kind].data ?? [])
      : (projectQuery.data ?? []);
  const filtered = useMemo(
    () =>
      records.filter((record) => {
        const term = search.trim().toLowerCase();
        return (
          (statusFilter === "all" || record.status === statusFilter) &&
          (!term ||
            `${record.key} ${record.title} ${record.description} ${record.type} ${record.assignee} ${record.priority} ${record.status}`
              .toLowerCase()
              .includes(term))
        );
      }),
    [records, search, statusFilter],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageRecords = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );
  const activeQuery = queries[kind];
  const parentKind: FlowKind =
    parent && flow.includes(parent.kind as FlowKind)
      ? (parent.kind as FlowKind)
      : "project";
  const parentNumber = parent
    ? recordNumber(queries[parentKind].data ?? [], parent)
    : 0;
  const workflowRecords = useMemo(
    () => [
      ...(projectQuery.data ?? []),
      ...(query.data ?? []),
      ...(taskQuery.data ?? []),
      ...(activityQuery.data ?? []),
      ...(reviewQuery.data ?? []),
    ],
    [
      activityQuery.data,
      projectQuery.data,
      query.data,
      reviewQuery.data,
      taskQuery.data,
    ],
  );
  const editorKind = editingKind ?? kind;
  const editorMutations = mutationSets[editorKind];
  const editorRecords = queries[editorKind].data ?? [];
  const editorParent =
    editing && editing.referenceType && editing.referenceId
      ? (workflowRecords.find(
          (record) =>
            record.kind === editing.referenceType &&
            (record.id === editing.referenceId ||
              record.key === editing.referenceId),
        ) ?? null)
      : parent;
  const busy =
    attachmentUploading ||
    editorMutations.create.isPending ||
    editorMutations.update.isPending;
  const workflowSearchOptions = useMemo(
    () =>
      workflowRecords
        .filter((record) =>
          initialView === "roadmap"
            ? record.kind === "issue"
            : workflowKindFilter === "all" ||
              record.kind === workflowKindFilter,
        )
        .map((record) => ({
          description: `${label(record.kind)} · ${record.key}`,
          label: record.title,
          value: `${record.kind}:${record.id}`,
        })),
    [initialView, workflowKindFilter, workflowRecords],
  );
  const workflowSearchResult = useMemo(
    () =>
      workflowRecords.find(
        (record) => `${record.kind}:${record.id}` === selectedWorkflowRecord,
      ) ?? null,
    [selectedWorkflowRecord, workflowRecords],
  );
  const isolatedWorkflow = useMemo(
    () =>
      workflowSearchResult
        ? isolateWorkflow(
            workflowSearchResult,
            workflowRecords,
            initialView === "roadmap",
          )
        : null,
    [initialView, workflowRecords, workflowSearchResult],
  );
  const roadmapIssue =
    initialView === "roadmap" && workflowSearchResult?.kind === "issue"
      ? workflowSearchResult
      : null;

  useEffect(() => {
    if (
      initialView !== "roadmap" ||
      selectedWorkflowRecord ||
      !query.data?.length
    )
      return;
    const requestedIssue = new URLSearchParams(window.location.search).get(
      "issue",
    );
    if (!requestedIssue) return;
    const issue = query.data.find(
      (record) => record.id === requestedIssue || record.key === requestedIssue,
    );
    if (!issue) return;
    setSelectedWorkflowRecord(`issue:${issue.id}`);
  }, [initialView, query.data, selectedWorkflowRecord]);

  useEffect(() => {
    if (workflowOnly) return;
    const params = new URLSearchParams(window.location.search);
    const reviewParentId = params.get("reviewParent") ?? "";
    if (reviewParentId) {
      const targetActivity = workflowRecords.find(
        (record) =>
          record.kind === "activity" &&
          (record.id === reviewParentId || record.key === reviewParentId),
      );
      const targetKey = targetActivity
        ? `drill-reviews:${targetActivity.id}`
        : "";
      if (targetActivity && openedRecord.current !== targetKey) {
        openedRecord.current = targetKey;
        setPath([
          ...buildParentPath(targetActivity, workflowRecords),
          targetActivity,
        ]);
        setForcedKind(null);
        setEditing(null);
        setSearch("");
        setStatusFilter("all");
        setPage(1);
        window.history.replaceState({ page: "projects" }, "", "/dev/projects");
      }
      return;
    }
    const drillIssueId = params.get("issue") ?? "";
    if (drillIssueId) {
      const targetIssue = workflowRecords.find(
        (record) =>
          record.kind === "issue" &&
          (record.id === drillIssueId || record.key === drillIssueId),
      );
      const targetKey = targetIssue ? `drill-issue:${targetIssue.id}` : "";
      if (targetIssue && openedRecord.current !== targetKey) {
        openedRecord.current = targetKey;
        setPath([
          ...buildParentPath(targetIssue, workflowRecords),
          targetIssue,
        ]);
        setForcedKind(null);
        setEditing(null);
        setSearch("");
        setStatusFilter("all");
        setPage(1);
        window.history.replaceState({ page: "projects" }, "", "/dev/projects");
      }
      return;
    }
    const drillProjectId = params.get("project") ?? "";
    if (drillProjectId) {
      const targetProject = workflowRecords.find(
        (record) =>
          record.kind === "project" &&
          (record.id === drillProjectId || record.key === drillProjectId),
      );
      const targetKey = targetProject
        ? `drill-project:${targetProject.id}`
        : "";
      if (targetProject && openedRecord.current !== targetKey) {
        openedRecord.current = targetKey;
        setPath([targetProject]);
        setForcedKind(null);
        setEditing(null);
        setSearch("");
        setStatusFilter("all");
        setPage(1);
        window.history.replaceState({ page: "projects" }, "", "/dev/projects");
      }
      return;
    }
    const recordId = params.get("record") ?? "";
    const recordKind = params.get("kind") as FlowKind | null;
    const targetKey = recordKind && recordId ? `${recordKind}:${recordId}` : "";
    if (
      !targetKey ||
      openedRecord.current === targetKey ||
      !flow.includes(recordKind as FlowKind)
    )
      return;
    const target = workflowRecords.find(
      (record) => record.kind === recordKind && record.id === recordId,
    );
    if (!target) return;
    const parents = buildParentPath(target, workflowRecords);
    openedRecord.current = targetKey;
    setPath(parents);
    setForcedKind(target.kind as FlowKind);
    setEditingKind(target.kind as FlowKind);
    setEditing(formFromRecord(target));
    setSaveError("");
    const deskRoot = "/dev";
    window.history.replaceState(
      { page: "projects" },
      "",
      `${deskRoot}/projects`,
    );
  }, [workflowOnly, workflowRecords]);

  function openNew() {
    setSaveError("");
    setEditingKind(kind);
    setEditing({
      ...formFromRecord(),
      key: nextRecordKey(kind, parent, records),
      moduleKey: "work-automation",
      referenceId: parent?.key ?? "",
      referenceType: parent?.kind ?? "",
      lane: kind === "project" ? "planning" : (parent?.lane ?? ""),
      status: defaultStatus(kind),
      type: defaultType(kind),
    });
  }

  function openEditor(record: ProjectManagerRecord) {
    if (!flow.includes(record.kind as FlowKind)) return;
    setSaveError("");
    setEditingKind(record.kind as FlowKind);
    setEditing(formFromRecord(record));
  }

  function save(form: ProjectManagerForm, pendingFiles: File[]) {
    const missing = requiredFields(form, editorKind);
    if (missing.length) {
      setSaveError(`Complete the required fields: ${missing.join(", ")}.`);
      return;
    }
    setSaveError("");
    setAttachmentUploading(true);
    const action = form.id
      ? editorMutations.update.mutateAsync({
          id: form.id,
          payload: payloadFromForm(form),
        })
      : editorMutations.create.mutateAsync(payloadFromForm(form));
    void action
      .then(async (record) => {
        const uploaded: ProjectManagerAttachment[] = [];
        try {
          for (const file of pendingFiles) {
            uploaded.push(
              await uploadProjectManagerAttachment(editorKind, record.id, file),
            );
          }
        } catch (uploadError) {
          await Promise.allSettled(
            uploaded.map((attachment) =>
              deleteProjectManagerAttachment(
                editorKind,
                record.id,
                attachment.id,
              ),
            ),
          );
          if (!form.id) {
            await mutationSets[editorKind].delete
              .mutateAsync(record.id)
              .catch(() => undefined);
          }
          throw uploadError;
        }
        toast.success(
          form.id
            ? `${label(editorKind)} updated`
            : `${label(editorKind)} created`,
          {
            description: pendingFiles.length
              ? `${record.title} · ${pendingFiles.length} attachment${
                  pendingFiles.length === 1 ? "" : "s"
                }`
              : record.title,
          },
        );
        setEditing(null);
        setEditingKind(null);
      })
      .catch((error) =>
        setSaveError(
          error instanceof Error
            ? error.message
            : "Record and attachments could not be saved.",
        ),
      )
      .finally(() => setAttachmentUploading(false));
  }

  function lookupOptions(lookupKind: LookupKind) {
    const defaults =
      lookupKind === "status"
        ? statusesFor(editorKind)
        : lookupKind === "type"
          ? typesFor(editorKind)
          : [];
    const values = [
      ...defaults,
      ...editorRecords.map((record) => record[lookupKind]).filter(Boolean),
    ];
    return uniqueOptions([
      ...values.map(toOption),
      ...createdOptions[lookupKind],
    ]);
  }

  async function createLookup(kind: LookupKind, name: string) {
    const option = toOption(name);
    setCreatedOptions((current) => ({
      ...current,
      [kind]: uniqueOptions([...current[kind], option]),
    }));
    return option;
  }

  function openIssueDelivery(view: "gantt" | "roadmap") {
    const issue = rootIssue ?? roadmapIssue;
    if (!issue) return;
    const reviewParentId =
      kind === "review" && parent?.kind === "activity" ? parent.id : "";
    window.location.assign(
      `/dev/roadmap?issue=${encodeURIComponent(issue.id)}${
        reviewParentId
          ? `&reviewParent=${encodeURIComponent(reviewParentId)}`
          : ""
      }${view === "gantt" ? "&view=gantt" : ""}`,
    );
  }

  function backToReviews() {
    const reviewParentId = new URLSearchParams(window.location.search).get(
      "reviewParent",
    );
    if (reviewParentId) {
      window.location.assign(
        `/dev/projects?reviewParent=${encodeURIComponent(reviewParentId)}`,
      );
      return;
    }
    window.history.back();
  }

  function selectHierarchyStage(stage: DeliveryStage) {
    if (stage === "roadmap" || stage === "gantt") {
      openIssueDelivery(stage);
      return;
    }
    const parentKind = previousFlowKind(stage);
    const parentIndex = path.findIndex((record) => record.kind === parentKind);
    if (parentIndex < 0) return;
    setForcedKind(null);
    setPath(path.slice(0, parentIndex + 1));
    setEditing(null);
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  }

  function selectRoadmapView(stage: DeliveryStage) {
    if (stage === "roadmap" || stage === "gantt") {
      const view = stage === "gantt" ? "gantt" : "timeline";
      setWorkflowView(view);
      if (roadmapIssue) {
        const reviewParentId = new URLSearchParams(window.location.search).get(
          "reviewParent",
        );
        window.history.replaceState(
          { issueId: roadmapIssue.id, page: "roadmap", view },
          "",
          `/dev/roadmap?issue=${encodeURIComponent(roadmapIssue.id)}${
            reviewParentId
              ? `&reviewParent=${encodeURIComponent(reviewParentId)}`
              : ""
          }${view === "gantt" ? "&view=gantt" : ""}`,
        );
      }
      return;
    }
    if (roadmapIssue && stage === "issue") {
      window.location.assign(
        `/dev/projects?issue=${encodeURIComponent(roadmapIssue.id)}`,
      );
    }
  }

  return (
    <WorkspacePage
      title={
        workflowOnly
          ? roadmapIssue
            ? roadmapIssue.title
            : initialView === "roadmap"
              ? "Issue Roadmap"
              : "Workflow"
          : parent
            ? `${label(parent.kind)} #${parentNumber} - ${parent.title}`
            : forcedKind
              ? pluralLabel(forcedKind)
              : "Projects"
      }
      description={
        roadmapIssue
          ? `Issue Roadmap · ${roadmapIssue.key} · ${label(roadmapIssue.status)} · ${label(roadmapIssue.type)}`
          : workflowOnly
            ? "Issue performance across tasks, activities, reviews, and Gantt schedule."
            : parent
              ? `Linked ${label(kind).toLowerCase()} records for this ${label(parent.kind).toLowerCase()}.`
              : "Select a project to drill down through issues, tasks, activities, and reviews."
      }
      technicalName={
        workflowOnly ? "page.workflow" : `page.work-automation.${plural(kind)}`
      }
      actions={
        workflowOnly ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={backToReviews}>
              <ArrowLeftIcon className="size-4" />
              Back to reviews
            </Button>
            {roadmapIssue ? (
              <WorkspaceStatusBadge
                label={label(roadmapIssue.status)}
                tone={
                  roadmapIssue.active
                    ? statusTone(roadmapIssue.status)
                    : "neutral"
                }
              />
            ) : null}
            <Button
              variant="outline"
              onClick={() => {
                void projectQuery.refetch();
                void query.refetch();
                void taskQuery.refetch();
                void activityQuery.refetch();
                void reviewQuery.refetch();
              }}
            >
              <RefreshCwIcon
                className={
                  query.isFetching ||
                  projectQuery.isFetching ||
                  taskQuery.isFetching ||
                  activityQuery.isFetching ||
                  reviewQuery.isFetching
                    ? "size-4 animate-spin"
                    : "size-4"
                }
              />
              Refresh
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {parent || forcedKind ? (
              <Button
                variant="outline"
                onClick={() => {
                  if (forcedKind) {
                    setForcedKind(null);
                    setPath([]);
                  } else setPath((current) => current.slice(0, -1));
                  setEditing(null);
                  setSearch("");
                  setStatusFilter("all");
                  setPage(1);
                }}
              >
                <ArrowLeftIcon className="size-4" />
                Back to{" "}
                {forcedKind
                  ? "projects"
                  : path.length === 1
                    ? "projects"
                    : plural(flow[level - 1] ?? "project")}
              </Button>
            ) : null}
            <Button
              disabled={activeQuery.isFetching}
              variant="outline"
              onClick={() => void activeQuery.refetch()}
            >
              <RefreshCwIcon
                className={
                  activeQuery.isFetching ? "size-4 animate-spin" : "size-4"
                }
              />
              Refresh
            </Button>
            <Button onClick={openNew}>
              <PlusIcon className="size-4" />
              New {kind}
            </Button>
          </div>
        )
      }
    >
      {workflowOnly ? (
        <>
          {initialView === "roadmap" && roadmapIssue ? (
            <DeliveryDrillRow
              active={workflowView === "gantt" ? "gantt" : "roadmap"}
              enabled={new Set<DeliveryStage>(["issue", "roadmap", "gantt"])}
              onSelect={selectRoadmapView}
            />
          ) : null}
          {initialView !== "roadmap" ? (
            <div className="mb-4 grid gap-3 rounded-md border bg-card p-4 shadow-sm md:grid-cols-[14rem_minmax(0,1fr)]">
              <WorkspaceSelect
                value={workflowKindFilter}
                options={[
                  { label: "All work types", value: "all" },
                  ...flow.map((item) => ({
                    label: pluralLabel(item),
                    value: item,
                  })),
                ]}
                onValueChange={(value) => {
                  setWorkflowKindFilter(value as "all" | FlowKind);
                  setSelectedWorkflowRecord("");
                }}
              />
              <WorkspaceLookup
                allowTextValue={false}
                emptyLabel="No workflow items found."
                options={workflowSearchOptions}
                placeholder="Search any project, issue, task, activity, review, or ID"
                value={selectedWorkflowRecord}
                onValueChange={setSelectedWorkflowRecord}
              />
            </div>
          ) : null}
          {workflowSearchResult && isolatedWorkflow ? (
            <>
              {initialView !== "roadmap" ? (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-md border bg-card p-4 shadow-sm">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <WorkspaceStatusBadge
                        label={label(workflowSearchResult.kind)}
                        tone="info"
                      />
                      <span className="font-medium">
                        {workflowSearchResult.title}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {workflowSearchResult.key}
                    </div>
                  </div>
                </div>
              ) : null}
              <div
                className={
                  initialView === "roadmap"
                    ? "grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]"
                    : ""
                }
              >
                <div className="min-w-0">
                  <div className="mb-4 flex flex-wrap gap-2 rounded-md border bg-card p-2 shadow-sm">
                    {(initialView === "roadmap"
                      ? (["timeline", "reviews", "kanban"] as WorkflowView[])
                      : ([
                          "timeline",
                          "gantt",
                          "reviews",
                          "kanban",
                        ] as WorkflowView[])
                    ).map((view) => (
                      <Button
                        key={view}
                        size="sm"
                        type="button"
                        variant={workflowView === view ? "default" : "ghost"}
                        onClick={() => {
                          setWorkflowView(view);
                          if (roadmapIssue) {
                            const reviewParentId = new URLSearchParams(
                              window.location.search,
                            ).get("reviewParent");
                            window.history.replaceState(
                              {
                                issueId: roadmapIssue.id,
                                page: "roadmap",
                                view,
                              },
                              "",
                              `/dev/roadmap?issue=${encodeURIComponent(roadmapIssue.id)}${
                                reviewParentId
                                  ? `&reviewParent=${encodeURIComponent(reviewParentId)}`
                                  : ""
                              }`,
                            );
                          }
                        }}
                      >
                        {view === "timeline" ? "Hierarchy" : label(view)}
                      </Button>
                    ))}
                  </div>
                  <WorkAutomationWorkflow
                    records={isolatedWorkflow}
                    onEditRecord={openEditor}
                    view={
                      workflowView === "gantt" ||
                      workflowView === "kanban" ||
                      workflowView === "reviews"
                        ? workflowView
                        : "timeline"
                    }
                  />
                </div>
                {initialView === "roadmap" ? (
                  <RoadmapStatistics records={isolatedWorkflow} />
                ) : null}
              </div>
            </>
          ) : (
            <div className="rounded-md border border-dashed bg-card p-10 text-center">
              <div className="font-medium">
                {initialView === "roadmap"
                  ? "Issue roadmap unavailable"
                  : "Select a workflow record"}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {initialView === "roadmap"
                  ? "Open a project issue and select Roadmap to view its delivery performance."
                  : "Select a workflow record to load its delivery timeline."}
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          {rootProject ? (
            <DeliveryDrillRow
              active={kind === "project" ? "issue" : kind}
              enabled={availableDeliveryStages(path)}
              onSelect={selectHierarchyStage}
            />
          ) : null}
          <WorkspaceFilters
            className="mt-4"
            filterOptions={[
              { id: "all", label: `All ${plural(kind)}` },
              ...uniqueOptions(
                statusesFor(kind)
                  .map(toOption)
                  .concat(records.map((record) => toOption(record.status))),
              ).map((option) => ({ id: option.value, label: option.label })),
            ]}
            filterValue={statusFilter}
            onFilterValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            onSearchValueChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            searchPlaceholder={`Search ${plural(kind)}`}
            searchValue={search}
          />
          <WorkspaceTablePanel className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr>
                    <WorkspaceTableHeaderCell>#</WorkspaceTableHeaderCell>
                    <WorkspaceTableHeaderCell>
                      {label(kind)}
                    </WorkspaceTableHeaderCell>
                    <WorkspaceTableHeaderCell>Type</WorkspaceTableHeaderCell>
                    <WorkspaceTableHeaderCell>
                      {actorLabel(kind)}
                    </WorkspaceTableHeaderCell>
                    {usesPriority(kind) ? (
                      <WorkspaceTableHeaderCell>
                        Priority
                      </WorkspaceTableHeaderCell>
                    ) : null}
                    <WorkspaceTableHeaderCell>
                      {dateLabel(kind)}
                    </WorkspaceTableHeaderCell>
                    <WorkspaceTableHeaderCell>Status</WorkspaceTableHeaderCell>
                    <WorkspaceTableHeaderCell align="right">
                      Action
                    </WorkspaceTableHeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {activeQuery.isLoading ? (
                    <tr>
                      <td colSpan={usesPriority(kind) ? 8 : 7}>
                        <GlobalLoader className="min-h-32" fullScreen={false} />
                      </td>
                    </tr>
                  ) : (
                    pageRecords.map((record, index) => (
                      <tr className="border-b last:border-0" key={record.id}>
                        <td className="w-16 px-4 py-3 font-mono text-xs text-muted-foreground">
                          {recordNumber(activeQuery.data ?? [], record) ||
                            index + 1 + (currentPage - 1) * rowsPerPage}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="text-left font-medium hover:underline"
                            type="button"
                            onClick={() => {
                              setSaveError("");
                              if (!nextKind && kind === "review" && rootIssue) {
                                openIssueDelivery("roadmap");
                              } else if (!nextKind) openEditor(record);
                              else {
                                setForcedKind(null);
                                setPath((current) => [...current, record]);
                                setSearch("");
                                setStatusFilter("all");
                                setPage(1);
                              }
                            }}
                          >
                            {record.title}
                          </button>
                          <div className="font-mono text-xs text-muted-foreground">
                            {record.key}
                          </div>
                          {nextKind ? (
                            <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <ListTreeIcon className="size-3.5" />
                              {childCount(
                                queries[nextKind].data ?? [],
                                record,
                              )}{" "}
                              {plural(nextKind)}
                            </div>
                          ) : kind === "review" && rootIssue ? (
                            <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <MapIcon className="size-3.5" />
                              Open roadmap
                            </div>
                          ) : record.description ? (
                            <div className="mt-1 max-w-[32rem] truncate text-xs text-muted-foreground">
                              {plainText(record.description)}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">{label(record.type)}</td>
                        <td className="px-4 py-3">{record.assignee || "-"}</td>
                        {usesPriority(kind) ? (
                          <td className="px-4 py-3">
                            {label(record.priority)}
                          </td>
                        ) : null}
                        <td className="px-4 py-3">
                          {record.startDate
                            ? `${formatDate(record.startDate)} → ${formatDate(record.dueDate)}`
                            : formatDate(record.dueDate)}
                        </td>
                        <td className="px-4 py-3">
                          <WorkspaceStatusBadge
                            label={
                              record.active ? label(record.status) : "Inactive"
                            }
                            tone={
                              !record.active
                                ? "neutral"
                                : statusTone(record.status)
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <WorkspaceRowActions
                              title={record.title}
                              actions={[
                                {
                                  id: "edit",
                                  label: "Edit",
                                  icon: <PencilIcon className="size-4" />,
                                  onSelect: () => {
                                    openEditor(record);
                                  },
                                },
                                record.active
                                  ? {
                                      id: "deactivate",
                                      label: "Deactivate",
                                      icon: <BanIcon className="size-4" />,
                                      onSelect: () =>
                                        mutations.deactivate.mutate(record.id),
                                    }
                                  : {
                                      id: "restore",
                                      label: "Restore",
                                      icon: (
                                        <ArchiveRestoreIcon className="size-4" />
                                      ),
                                      onSelect: () =>
                                        mutations.restore.mutate(record.id),
                                    },
                                {
                                  id: "delete",
                                  label: "Delete",
                                  icon: <Trash2Icon className="size-4" />,
                                  tone: "destructive",
                                  onSelect: () => {
                                    if (
                                      window.confirm(`Delete ${record.title}?`)
                                    )
                                      mutations.delete.mutate(record.id);
                                  },
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!activeQuery.isLoading && !filtered.length ? (
              <WorkspaceTableEmptyState>
                No {plural(kind)} found.
              </WorkspaceTableEmptyState>
            ) : null}
          </WorkspaceTablePanel>
          <WorkspacePagination
            page={currentPage}
            rowsPerPage={rowsPerPage}
            showingLabel={buildShowingLabel(
              currentPage,
              rowsPerPage,
              filtered.length,
            )}
            singularLabel={kind}
            totalCount={filtered.length}
            totalPages={totalPages}
            onNextPage={() =>
              setPage((value) => Math.min(totalPages, value + 1))
            }
            onPageChange={setPage}
            onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(value);
              setPage(1);
            }}
          />
        </>
      )}
      {editing ? (
        <IssueDialog
          kind={editorKind}
          parent={editorParent}
          form={editing}
          error={saveError}
          loading={busy}
          options={lookupOptions}
          onCancel={() => {
            setEditing(null);
            setEditingKind(null);
          }}
          onCreate={createLookup}
          onSave={save}
        />
      ) : null}
    </WorkspacePage>
  );
}

type LookupKind = "assignee" | "status" | "type";

function DeliveryDrillRow({
  active,
  enabled,
  onSelect,
}: {
  active: DeliveryStage | null;
  enabled: Set<DeliveryStage>;
  onSelect: (stage: DeliveryStage) => void;
}) {
  const stages: Array<{ id: DeliveryStage; label: string }> = [
    { id: "issue", label: "Issues" },
    { id: "task", label: "Tasks" },
    { id: "activity", label: "Activities" },
    { id: "review", label: "Reviews" },
    { id: "roadmap", label: "Roadmap" },
    { id: "gantt", label: "Gantt" },
  ];
  return (
    <nav
      aria-label="Project delivery drill"
      className="mb-4 overflow-x-auto rounded-md border bg-card p-2 shadow-sm"
    >
      <div className="flex min-w-max items-center gap-1">
        {stages.map((stage, index) => (
          <div className="flex items-center gap-1" key={stage.id}>
            {index ? (
              <ChevronRightIcon className="size-4 text-muted-foreground/60" />
            ) : null}
            <Button
              disabled={!enabled.has(stage.id)}
              size="sm"
              type="button"
              variant={active === stage.id ? "default" : "ghost"}
              onClick={() => onSelect(stage.id)}
            >
              {stage.id === "roadmap" ? <MapIcon className="size-4" /> : null}
              {stage.id === "gantt" ? (
                <ChartNoAxesGanttIcon className="size-4" />
              ) : null}
              {stage.label}
            </Button>
          </div>
        ))}
      </div>
    </nav>
  );
}

function IssueDialog({
  kind,
  parent,
  form: initial,
  error,
  loading,
  options,
  onCancel,
  onCreate,
  onSave,
}: {
  kind: FlowKind;
  parent: ProjectManagerRecord | null;
  form: ProjectManagerForm;
  error: string;
  loading: boolean;
  options: (kind: LookupKind) => WorkspaceLookupOption[];
  onCancel: () => void;
  onCreate: (kind: LookupKind, name: string) => Promise<WorkspaceLookupOption>;
  onSave: (form: ProjectManagerForm, pendingFiles: File[]) => void;
}) {
  const [form, setForm] = useState(initial);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const invalid = error
    ? new Set(requiredFields(form, kind).map((field) => field.toLowerCase()))
    : new Set<string>();
  const patch = <K extends keyof ProjectManagerForm>(
    key: K,
    value: ProjectManagerForm[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <WorkspaceUpsertDialog
      className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"
      description={
        parent
          ? `This ${kind} belongs to ${parent.title}.`
          : kind === "project"
            ? "Define the roadmap ownership, delivery dates, stage, and intended outcome."
            : `Capture the ${kind} details required for the project delivery flow.`
      }
      open
      onClose={onCancel}
      title={`${form.id ? "Edit" : "New"} ${kind}`}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form, pendingFiles);
        }}
      >
        {error ? (
          <WorkspaceFormBanner title={`${label(kind)} could not be saved`}>
            {error}
          </WorkspaceFormBanner>
        ) : null}
        <WorkspaceFormGrid
          className="items-start md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
          columns={2}
        >
          <div className="grid gap-5">
            <WorkspaceFormField label="Title" required>
              <Input
                aria-invalid={invalid.has("title")}
                value={form.title}
                onChange={(event) => patch("title", event.target.value)}
              />
              {invalid.has("title") ? (
                <span className="text-xs text-destructive">
                  Title is required.
                </span>
              ) : null}
            </WorkspaceFormField>
            <WorkspaceFormField label={detailsLabel(kind)}>
              <WorkspaceMinimalEditor
                className="[&_.ProseMirror]:min-h-[260px]"
                content={form.description}
                onChange={(value) => patch("description", value)}
              />
            </WorkspaceFormField>
          </div>
          <div className="grid gap-5">
            <WorkspaceFormField label={`${label(kind)} ID`} required>
              <Input
                aria-invalid={invalid.has("record key")}
                className="font-mono"
                readOnly
                value={form.key}
              />
              {invalid.has("record key") ? (
                <span className="text-xs text-destructive">
                  {label(kind)} ID is required.
                </span>
              ) : null}
            </WorkspaceFormField>
            <IssueLookup
              kind="type"
              label={`${label(kind)} type`}
              required
              form={form}
              options={options}
              onCreate={onCreate}
              onChange={patch}
            />
            <IssueLookup
              kind="status"
              label="Status"
              required
              form={form}
              options={options}
              onCreate={onCreate}
              onChange={patch}
            />
            {usesPriority(kind) ? (
              <WorkspaceFormField label="Priority" required>
                <WorkspaceLookup
                  allowTextValue={false}
                  options={priorityOptions.map(toOption)}
                  placeholder="Select priority"
                  value={form.priority}
                  onValueChange={(value) =>
                    patch("priority", value as ProjectManagerForm["priority"])
                  }
                />
              </WorkspaceFormField>
            ) : null}
            <IssueLookup
              kind="assignee"
              label={actorLabel(kind)}
              required={
                kind === "project" || kind === "task" || kind === "review"
              }
              form={form}
              options={options}
              onCreate={onCreate}
              onChange={patch}
            />
            {kind === "project" || kind === "issue" || kind === "task" ? (
              <WorkspaceFormField
                label="Planned start"
                required={kind === "project"}
              >
                <WorkspaceDatePicker
                  value={form.startDate}
                  onValueChange={(value) => patch("startDate", value)}
                />
              </WorkspaceFormField>
            ) : null}
            <WorkspaceFormField label={dateLabel(kind)}>
              <WorkspaceDatePicker
                value={form.dueDate}
                onValueChange={(value) => patch("dueDate", value)}
              />
            </WorkspaceFormField>
            {kind === "project" ? (
              <WorkspaceFormField label="Roadmap stage" required>
                <WorkspaceSelect
                  value={form.lane}
                  options={roadmapStageOptions.map(toOption)}
                  onValueChange={(value) => patch("lane", value)}
                />
              </WorkspaceFormField>
            ) : null}
          </div>
        </WorkspaceFormGrid>
        <ProjectManagerAttachments
          kind={kind}
          pendingFiles={pendingFiles}
          {...(form.id ? { recordId: form.id } : {})}
          onPendingFilesChange={setPendingFiles}
        />
        <WorkspaceFormFooter
          className="mt-6 border-t pt-4"
          onCancel={onCancel}
          primaryLabel={form.id ? "Update" : "Save"}
          primaryLoading={loading}
        />
      </form>
    </WorkspaceUpsertDialog>
  );
}

function IssueLookup({
  kind,
  label: fieldLabel,
  required = false,
  form,
  options,
  onCreate,
  onChange,
}: {
  kind: LookupKind;
  label: string;
  required?: boolean;
  form: ProjectManagerForm;
  options: (kind: LookupKind) => WorkspaceLookupOption[];
  onCreate: (kind: LookupKind, name: string) => Promise<WorkspaceLookupOption>;
  onChange: <K extends keyof ProjectManagerForm>(
    key: K,
    value: ProjectManagerForm[K],
  ) => void;
}) {
  return (
    <WorkspaceFormField label={fieldLabel} required={required}>
      <WorkspaceLookup
        allowTextValue={false}
        createLabel={`Add ${fieldLabel}`}
        createMode="inline"
        emptyLabel={`No ${fieldLabel.toLowerCase()} found. Type a name to add it.`}
        options={options(kind)}
        placeholder={`Search or add ${fieldLabel.toLowerCase()}`}
        value={form[kind]}
        onCreate={(name) => onCreate(kind, name)}
        onValueChange={(value, option) =>
          onChange(kind, kind === "assignee" ? (option?.label ?? value) : value)
        }
      />
    </WorkspaceFormField>
  );
}

function requiredFields(form: ProjectManagerForm, kind: FlowKind): string[] {
  const fields: Array<[string, string]> = [
    ["Record key", form.key],
    ["Title", form.title],
    ["Type", form.type],
    ["Status", form.status],
  ];
  if (usesPriority(kind)) fields.push(["Priority", form.priority]);
  if (kind === "project" || kind === "task" || kind === "review")
    fields.push([actorLabel(kind), form.assignee]);
  if (kind === "project") {
    fields.push(["Planned start", form.startDate]);
    fields.push(["Roadmap stage", form.lane]);
  }
  return fields.filter(([, value]) => !value.trim()).map(([name]) => name);
}
function belongsTo(record: ProjectManagerRecord, parent: ProjectManagerRecord) {
  return (
    record.referenceType === parent.kind &&
    (record.referenceId === parent.id || record.referenceId === parent.key)
  );
}
function childCount(
  children: ProjectManagerRecord[],
  parent: ProjectManagerRecord,
) {
  return children.filter((record) => belongsTo(record, parent)).length;
}
function recordNumber(
  records: ProjectManagerRecord[],
  record: ProjectManagerRecord,
) {
  const index = records.findIndex((item) => item.id === record.id);
  return index >= 0 ? index + 1 : 0;
}
function statusesFor(kind: FlowKind) {
  return kind === "project"
    ? projectStatusOptions
    : kind === "issue"
      ? issueStatusOptions
      : kind === "task"
        ? taskStatusOptions
        : kind === "activity"
          ? activityStatusOptions
          : reviewStatusOptions;
}
function typesFor(kind: FlowKind) {
  return kind === "project"
    ? projectTypeOptions
    : kind === "issue"
      ? issueTypeOptions
      : kind === "task"
        ? taskTypeOptions
        : kind === "activity"
          ? activityTypeOptions
          : reviewTypeOptions;
}
function defaultStatus(kind: FlowKind) {
  return statusesFor(kind)[0] ?? "open";
}
function defaultType(kind: FlowKind) {
  return typesFor(kind)[0] ?? kind;
}
function initialWorkflowView(initialView: WorkflowView): WorkflowView {
  if (initialView !== "roadmap") return initialView;
  const requestedView = new URLSearchParams(window.location.search).get("view");
  return requestedView === "gantt" ||
    requestedView === "kanban" ||
    requestedView === "reviews" ||
    requestedView === "timeline"
    ? requestedView
    : "timeline";
}
function previousFlowKind(
  stage: Exclude<DeliveryStage, "roadmap" | "gantt">,
): FlowKind {
  if (stage === "issue") return "project";
  if (stage === "task") return "issue";
  if (stage === "activity") return "task";
  return "activity";
}
function availableDeliveryStages(path: ProjectManagerRecord[]) {
  const enabled = new Set<DeliveryStage>();
  if (path.some((record) => record.kind === "project")) {
    enabled.add("issue");
  }
  if (path.some((record) => record.kind === "issue")) {
    enabled.add("task");
    enabled.add("roadmap");
    enabled.add("gantt");
  }
  if (path.some((record) => record.kind === "task")) enabled.add("activity");
  if (path.some((record) => record.kind === "activity")) enabled.add("review");
  return enabled;
}
function plural(kind: FlowKind) {
  return kind === "activity" ? "activities" : `${kind}s`;
}
function usesPriority(kind: FlowKind) {
  return kind === "project" || kind === "issue" || kind === "task";
}
function actorLabel(kind: FlowKind) {
  return kind === "project"
    ? "Owner"
    : kind === "issue"
      ? "Owner"
      : kind === "task"
        ? "Assignee"
        : kind === "activity"
          ? "Performed by"
          : "Reviewer";
}
function dateLabel(kind: FlowKind) {
  return kind === "project"
    ? "Target finish"
    : kind === "activity"
      ? "Activity date"
      : kind === "review"
        ? "Review due date"
        : kind === "issue"
          ? "Target date"
          : "Due date";
}
function detailsLabel(kind: FlowKind) {
  return kind === "project"
    ? "Roadmap scope and outcome"
    : kind === "activity"
      ? "Work update"
      : kind === "review"
        ? "Review notes and feedback"
        : kind === "task"
          ? "Execution details"
          : "Problem description and acceptance outcome";
}
function nextRecordKey(
  kind: FlowKind,
  parent: ProjectManagerRecord | null,
  records: ProjectManagerRecord[],
) {
  const prefix =
    kind === "project"
      ? "PRJ"
      : kind === "issue"
        ? "ISS"
        : kind === "task"
          ? "TSK"
          : kind === "activity"
            ? "ACT"
            : "REV";
  const used = new Set(records.map((record) => record.key.toLowerCase()));
  let number = records.length + 1;
  let key = "";
  do {
    const sequence = String(number).padStart(4, "0");
    key = parent
      ? `${parent.key}-${prefix}-${sequence}`
      : `${prefix}-${sequence}`;
    number += 1;
  } while (used.has(key.toLowerCase()));
  return key;
}
function pluralLabel(kind: FlowKind) {
  const value = plural(kind);
  return value.charAt(0).toUpperCase() + value.slice(1);
}
function buildParentPath(
  target: ProjectManagerRecord,
  records: ProjectManagerRecord[],
) {
  const parents: ProjectManagerRecord[] = [];
  let current = target;
  while (current.referenceType && current.referenceId) {
    const parent = records.find(
      (record) =>
        record.kind === current.referenceType &&
        (record.id === current.referenceId ||
          record.key === current.referenceId),
    );
    if (!parent || parents.some((record) => record.id === parent.id)) break;
    parents.unshift(parent);
    current = parent;
  }
  return parents;
}
function isolateWorkflow(
  selected: ProjectManagerRecord,
  records: ProjectManagerRecord[],
  useSelectedRoot = false,
): WorkflowRecords {
  const parentPath = buildParentPath(selected, records);
  const root =
    (useSelectedRoot ? selected : null) ??
    parentPath.find((record) => record.kind === "project") ??
    selected;
  const included = new Map<string, ProjectManagerRecord>([[root.id, root]]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const record of records) {
      if (included.has(record.id)) continue;
      if ([...included.values()].some((parent) => belongsTo(record, parent))) {
        included.set(record.id, record);
        changed = true;
      }
    }
  }
  const scoped = [...included.values()];
  return {
    activities: scoped.filter((record) => record.kind === "activity"),
    issues: scoped.filter((record) => record.kind === "issue"),
    projects: scoped.filter((record) => record.kind === "project"),
    reviews: scoped.filter((record) => record.kind === "review"),
    tasks: scoped.filter((record) => record.kind === "task"),
  };
}
function toOption(value: string): WorkspaceLookupOption {
  return { label: label(value), value };
}
function uniqueOptions(options: WorkspaceLookupOption[]) {
  return [
    ...new Map(
      options
        .filter((option) => option.value)
        .map((option) => [option.value.toLowerCase(), option]),
    ).values(),
  ];
}
function label(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
function plainText(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function statusTone(status: string): "danger" | "info" | "success" | "warning" {
  return status === "completed"
    ? "success"
    : status === "blocked"
      ? "danger"
      : status === "in-progress" || status === "needs-review"
        ? "info"
        : "warning";
}
function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}
