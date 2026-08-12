import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, CircleAlertIcon, LoaderCircleIcon } from "lucide-react";
import { getHostingerDashboard } from "./hostinger-mcp.services";
import type { HostingerContainer, HostingerMetric, HostingerNode } from "./hostinger-mcp.types";

export function HostingerDetailWorkspace() {
  const view = new URLSearchParams(window.location.search).get("view") ?? "overview";
  const dashboard = useQuery({
    queryKey: ["devkit", "hostinger-mcp", "dashboard"],
    queryFn: getHostingerDashboard,
    refetchInterval: 60_000
  });
  const node = dashboard.data?.nodes[0];
  return (
    <main className="mx-auto w-full max-w-[92rem] px-5 py-7 lg:px-8">
      <a
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        href="/app/devkit/hostinger"
      >
        <ArrowLeftIcon className="size-4" /> Hostinger infrastructure
      </a>
      {dashboard.isLoading ? (
        <div className="flex justify-center gap-2 py-24 text-sm text-muted-foreground">
          <LoaderCircleIcon className="size-5 animate-spin" /> Loading details
        </div>
      ) : node ? (
        <DetailContent node={node} view={view} />
      ) : (
        <p className="py-16 text-sm text-destructive">
          {dashboard.error?.message ?? "No VPS data is available."}
        </p>
      )}
    </main>
  );
}

function DetailContent({ node, view }: { node: HostingerNode; view: string }) {
  const title = titles[view] ?? "VPS overview";
  const containers = node.projects.flatMap((project) => project.containers);
  const selected =
    view === "attention"
      ? containers.filter(needsAttention)
      : view === "running"
        ? containers.filter((item) => item.state === "running")
        : containers;
  const metric = metrics(node)[view];
  return (
    <>
      <header className="border-b py-6">
        <p className="text-sm text-muted-foreground">{node.hostname}</p>
        <h1 className="pt-1 text-2xl font-semibold">{title}</h1>
      </header>
      {metric ? (
        <MetricDetail metric={metric} />
      ) : view === "projects" ? (
        <ProjectDetail node={node} />
      ) : view === "overview" ? (
        <Overview node={node} />
      ) : (
        <ContainerDetail containers={selected} attention={view === "attention"} />
      )}
    </>
  );
}

function ContainerDetail({
  attention,
  containers
}: {
  attention: boolean;
  containers: HostingerContainer[];
}) {
  return (
    <section className="divide-y py-4">
      {containers.map((container) => (
        <article className="grid gap-2 py-4 md:grid-cols-[1.2fr_1.3fr_1fr]" key={container.id}>
          <div>
            <strong>{container.name}</strong>
            <p className="pt-1 text-sm text-muted-foreground">{container.image}</p>
          </div>
          <div>
            <span className="text-sm font-medium capitalize">{container.state}</span>
            <p className="pt-1 text-sm text-muted-foreground">Docker health: {container.health}</p>
          </div>
          <div>
            {attention ? (
              <p className="flex gap-2 text-sm text-amber-700">
                <CircleAlertIcon className="size-4 shrink-0" />
                {attentionReason(container)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {container.ports.join(", ") || "No published ports"}
              </p>
            )}
          </div>
        </article>
      ))}
      {containers.length === 0 ? (
        <p className="py-12 text-sm text-muted-foreground">No matching containers.</p>
      ) : null}
    </section>
  );
}

function ProjectDetail({ node }: { node: HostingerNode }) {
  return (
    <section className="grid gap-4 py-6 sm:grid-cols-2 lg:grid-cols-3">
      {node.projects.map((project) => (
        <article className="rounded-xl border p-5" key={project.name}>
          <strong>{project.name}</strong>
          <p className="pt-2 text-sm text-muted-foreground">
            {project.containers.length} containers · {project.status}
          </p>
        </article>
      ))}
    </section>
  );
}

function Overview({ node }: { node: HostingerNode }) {
  return (
    <section className="grid gap-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
      <Fact label="State" value={node.state} />
      <Fact label="Plan" value={node.plan} />
      <Fact label="Operating system" value={node.operatingSystem} />
      <Fact label="Health" value={node.health} />
    </section>
  );
}

function MetricDetail({ metric }: { metric: HostingerMetric }) {
  return (
    <section className="py-8">
      <strong className="text-4xl">
        {metric.percent === null ? metric.current.toFixed(1) : `${metric.percent.toFixed(1)}%`}
      </strong>
      <p className="pt-2 text-sm text-muted-foreground">
        Current value: {metric.current.toLocaleString()} {metric.unit}
      </p>
      <p className="pt-6 text-sm text-muted-foreground">
        {metric.points.length} samples received during the latest six-hour Hostinger window.
      </p>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <strong className="block pt-2 capitalize">{value}</strong>
    </div>
  );
}
function needsAttention(container: HostingerContainer) {
  return (
    container.state !== "running" || !["", "healthy", "not configured"].includes(container.health)
  );
}
function attentionReason(container: HostingerContainer) {
  if (container.state !== "running") return `Container is ${container.state}.`;
  return `Health check reports ${container.health}.`;
}
function metrics(node: HostingerNode): Record<string, HostingerMetric> {
  return {
    cpu: node.metrics.cpu,
    memory: node.metrics.memory,
    disk: node.metrics.disk,
    incoming: node.metrics.incomingTraffic,
    outgoing: node.metrics.outgoingTraffic,
    uptime: node.metrics.uptime
  };
}
const titles: Record<string, string> = {
  overview: "VPS overview",
  projects: "Docker projects",
  containers: "All containers",
  running: "Running containers",
  attention: "Containers needing attention",
  cpu: "CPU usage",
  memory: "Memory usage",
  disk: "Disk usage",
  incoming: "Incoming traffic",
  outgoing: "Outgoing traffic",
  uptime: "VPS uptime"
};
