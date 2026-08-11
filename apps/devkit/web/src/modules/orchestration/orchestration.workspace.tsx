import { Button, Card, CardContent, WorkspacePage, WorkspaceStatusBadge } from "@codexsun/ui";
import {
  ActivityIcon,
  ArrowRightIcon,
  BotIcon,
  BoxesIcon,
  BrainCircuitIcon,
  CheckCircle2Icon,
  GitBranchIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  WorkflowIcon
} from "lucide-react";
import type { ReactNode } from "react";
import { useTodayDashboard } from "../today/today.hooks";
import { useOrchestrationCatalog } from "./orchestration.hooks";
import type { OrchestrationCatalog } from "./orchestration.types";

export function OrchestrationWorkspace() {
  const catalogQuery = useOrchestrationCatalog();
  const todayQuery = useTodayDashboard();
  const catalog = catalogQuery.data;
  const today = todayQuery.data;
  const attention =
    (today?.overdueTasks.length ?? 0) +
    (today?.blockedIssues.length ?? 0) +
    (today?.failedChecks.length ?? 0);

  const refresh = () => {
    void catalogQuery.refetch();
    void todayQuery.refetch();
  };

  return (
    <WorkspacePage
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href="/app/devkit/projects">
              Open projects
              <ArrowRightIcon />
            </a>
          </Button>
          <Button
            disabled={catalogQuery.isFetching || todayQuery.isFetching}
            onClick={refresh}
            variant="outline"
          >
            <RefreshCwIcon
              className={catalogQuery.isFetching || todayQuery.isFetching ? "animate-spin" : ""}
            />
            Refresh
          </Button>
        </div>
      }
      description="Build, deploy, operate, and improve software from one project-centric workspace."
      technicalName="devkit.orchestration"
      title="Engineering Command Center"
    >
      {catalogQuery.error || todayQuery.error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {catalogQuery.error?.message ?? todayQuery.error?.message}
        </div>
      ) : null}

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.08] via-background to-background">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <WorkspaceStatusBadge label="CodeLogicX" tone="info" />
              <WorkspaceStatusBadge
                label={`Technical core: ${catalog?.technicalName ?? "devkit"}`}
                tone="neutral"
              />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Developer and engineering orchestration
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Projects provide context. Agents are configurable. Models are replaceable. Tools are
              permission-scoped. Humans retain approval over risky operations.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric
              icon={<BotIcon />}
              label="Agent profiles"
              value={catalog?.agentProfiles.length ?? 0}
            />
            <Metric
              icon={<BrainCircuitIcon />}
              label="Assist modes"
              value={catalog?.assistModes.length ?? 0}
            />
            <Metric
              icon={<ShieldCheckIcon />}
              label="Approval queue"
              value={today?.waitingReviews.length ?? 0}
            />
            <Metric icon={<ActivityIcon />} label="Needs attention" value={attention} />
          </div>
        </CardContent>
      </Card>

      <Section
        description="A visible path from idea to operation. Connected stages use existing DevKit modules; foundation and planned stages remain explicit."
        icon={<WorkflowIcon />}
        title="Engineering lifecycle"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(catalog?.lifecycle ?? []).map((phase, index) => (
            <a
              className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/20"
              href={phase.href}
              key={phase.id}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <WorkspaceStatusBadge
                  label={phaseStateLabel(phase.state)}
                  tone={phaseTone(phase.state)}
                />
              </div>
              <h3 className="mt-4 font-semibold group-hover:text-primary">{phase.label}</h3>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{phase.objective}</p>
              {phase.approvalRequired ? (
                <p className="mt-3 text-xs font-medium text-amber-700">Human approval required</p>
              ) : null}
            </a>
          ))}
        </div>
      </Section>

      <div className="grid items-start gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Section
          description="Initial roles are definitions only. Execution arrives through a provider-neutral runtime with isolated workspaces and bounded tools."
          icon={<BotIcon />}
          title="Agent orchestrator foundation"
        >
          <div className="grid gap-3 md:grid-cols-2">
            {(catalog?.agentProfiles ?? []).map((agent) => (
              <Card key={agent.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold">{agent.name}</h3>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">
                        {agent.description}
                      </p>
                    </div>
                    <WorkspaceStatusBadge label="Defined" tone="info" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {agent.capabilities.slice(0, 4).map((capability) => (
                      <span
                        className="rounded-md border bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground"
                        key={capability}
                      >
                        {label(capability)}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Permission: {label(agent.permissionLevel)}
                    {agent.requiresApprovalFor.length
                      ? ` - Approval for ${agent.requiresApprovalFor.join(", ")}`
                      : ""}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>

        <div className="space-y-5">
          <Section
            description="The non-negotiable controls around every future agent run."
            icon={<ShieldCheckIcon />}
            title="Control boundaries"
          >
            <div className="space-y-3">
              {(catalog?.controlBoundaries ?? []).map((boundary) => (
                <div className="rounded-lg border bg-card p-4" key={boundary.id}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2Icon className="size-4 text-primary" />
                    <h3 className="font-semibold">{boundary.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-muted-foreground">
                    {boundary.description}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <Section
            description="Context-aware operating modes with explicit permission ceilings."
            icon={<BoxesIcon />}
            title="Assist modes"
          >
            <div className="flex flex-wrap gap-2">
              {(catalog?.assistModes ?? []).map((mode) => (
                <span
                  className="rounded-md border bg-card px-3 py-2 text-sm"
                  key={mode.id}
                  title={`${mode.purpose} Permission: ${label(mode.permissionLevel)}.`}
                >
                  {mode.label}
                </span>
              ))}
            </div>
          </Section>
        </div>
      </div>

      <Section
        description="Live signals already connected to the current repository and project records."
        icon={<GitBranchIcon />}
        title="Engineering signals"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Signal
            label="Changed repositories"
            value={today?.changedRepositories.length ?? 0}
            href="/app/devkit/github"
          />
          <Signal
            label="Failed checks"
            value={today?.failedChecks.length ?? 0}
            href="/app/devkit/today"
          />
          <Signal
            label="Blocked issues"
            value={today?.blockedIssues.length ?? 0}
            href="/app/devkit/projects"
          />
          <Signal
            label="Reviews waiting"
            value={today?.waitingReviews.length ?? 0}
            href="/app/devkit/projects"
          />
        </div>
      </Section>
    </WorkspacePage>
  );
}

function Metric({
  icon,
  label: metricLabel,
  value
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border bg-background/80 p-3">
      <div className="flex items-center justify-between gap-2 text-primary [&_svg]:size-4">
        {icon}
        <strong className="text-lg text-foreground">{value}</strong>
      </div>
      <p className="mt-2 text-xs font-medium text-muted-foreground">{metricLabel}</p>
    </div>
  );
}

function Section({
  children,
  description,
  icon,
  title
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section>
      <div className="mb-3 flex items-start gap-3">
        <span className="mt-0.5 text-primary [&_svg]:size-5">{icon}</span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Signal({
  href,
  label: signalLabel,
  value
}: {
  href: string;
  label: string;
  value: number;
}) {
  return (
    <a
      className="flex items-center justify-between rounded-lg border bg-card p-4 hover:border-primary/40"
      href={href}
    >
      <span className="text-sm text-muted-foreground">{signalLabel}</span>
      <strong className="text-xl">{value}</strong>
    </a>
  );
}

function phaseTone(state: OrchestrationCatalog["lifecycle"][number]["state"]) {
  if (state === "connected") return "success" as const;
  if (state === "foundation") return "info" as const;
  return "neutral" as const;
}

function phaseStateLabel(state: OrchestrationCatalog["lifecycle"][number]["state"]) {
  return state === "connected" ? "Connected" : state === "foundation" ? "Foundation" : "Planned";
}

function label(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
