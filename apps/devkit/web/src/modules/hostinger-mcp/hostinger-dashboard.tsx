import {
  ActivityIcon,
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  CpuIcon,
  HardDriveIcon,
  MemoryStickIcon,
  ServerIcon
} from "lucide-react";
import { HostingerContainerList } from "./hostinger-container-list";
import { HostingerMetricCard } from "./hostinger-metric-card";
import type { HostingerDashboard as DashboardData } from "./hostinger-mcp.types";

export function HostingerDashboard({ dashboard }: { dashboard: DashboardData }) {
  const node = dashboard.nodes[0];
  if (!node) {
    return <p className="py-12 text-center text-sm text-muted-foreground">No VPS was found.</p>;
  }
  return (
    <>
      <section className="grid gap-6 py-7 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <ServerIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <a
                className="truncate text-xl font-semibold hover:text-primary"
                href={detailHref("overview")}
              >
                {node.hostname}
              </a>
              <HealthBadge health={node.health} />
            </div>
            <p className="pt-1 text-sm text-muted-foreground">
              {node.plan} · {node.operatingSystem}
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-4 text-sm">
              <span>{node.capacity.cpuCores} CPU cores</span>
              <span>{formatBytes(node.capacity.memoryBytes)} RAM</span>
              <span>{formatBytes(node.capacity.diskBytes)} disk</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-l-0 lg:border-l lg:pl-6">
          <Summary label="Projects" scenario="projects" value={node.summary.projectCount} />
          <Summary label="Containers" scenario="containers" value={node.summary.containerCount} />
          <Summary label="Running" scenario="running" value={node.summary.runningCount} />
          <Summary
            label="Need attention"
            scenario="attention"
            value={node.summary.unhealthyCount}
          />
        </div>
      </section>

      <section className="grid gap-3 border-t py-7 sm:grid-cols-2 xl:grid-cols-3">
        <HostingerMetricCard
          format={formatPercent}
          href={detailHref("cpu")}
          icon={CpuIcon}
          label="CPU usage"
          metric={node.metrics.cpu}
        />
        <HostingerMetricCard
          format={formatBytes}
          href={detailHref("memory")}
          icon={MemoryStickIcon}
          label="Memory usage"
          metric={node.metrics.memory}
          primaryValue={formatMetricPercent(node.metrics.memory.percent)}
          secondaryText={`${formatBytes(node.metrics.memory.current)} of ${formatBytes(node.capacity.memoryBytes)}`}
        />
        <HostingerMetricCard
          format={formatBytes}
          href={detailHref("disk")}
          icon={HardDriveIcon}
          label="Disk usage"
          metric={node.metrics.disk}
          secondaryText={`of ${formatBytes(node.capacity.diskBytes)} total`}
          visual="gauge"
        />
        <HostingerMetricCard
          format={formatBytes}
          href={detailHref("incoming")}
          icon={ArrowDownToLineIcon}
          label="Incoming traffic"
          metric={node.metrics.incomingTraffic}
        />
        <HostingerMetricCard
          format={formatBytes}
          href={detailHref("outgoing")}
          icon={ArrowUpFromLineIcon}
          label="Outgoing traffic"
          metric={node.metrics.outgoingTraffic}
        />
        <HostingerMetricCard
          format={formatDuration}
          href={detailHref("uptime")}
          icon={ActivityIcon}
          label="Uptime"
          metric={node.metrics.uptime}
        />
      </section>

      <HostingerContainerList projects={node.projects} />
    </>
  );
}

function HealthBadge({ health }: { health: "healthy" | "attention" | "offline" }) {
  const tone =
    health === "healthy"
      ? "bg-emerald-100 text-emerald-700"
      : health === "attention"
        ? "bg-amber-100 text-amber-700"
        : "bg-destructive/10 text-destructive";
  return (
    <a
      href={detailHref(health === "healthy" ? "overview" : "attention")}
      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${tone}`}
    >
      {health}
    </a>
  );
}

function Summary({ label, scenario, value }: { label: string; scenario: string; value: number }) {
  return (
    <a
      className="rounded-lg p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href={detailHref(scenario)}
    >
      <strong className="text-xl font-semibold">{value}</strong>
      <span className="block text-xs text-muted-foreground">{label}</span>
    </a>
  );
}

function detailHref(view: string) {
  return `/app/devkit/hostinger-details?view=${view}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}
function formatMetricPercent(value: number | null) {
  return value === null ? "Unavailable" : `${value.toFixed(1)}%`;
}
function formatBytes(value: number) {
  if (value < 1024) return `${value.toFixed(0)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let amount = value;
  let unit = -1;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount.toFixed(amount >= 10 ? 1 : 2)} ${units[unit]}`;
}
function formatDuration(value: number) {
  const days = Math.floor(value / 86_400);
  const hours = Math.floor((value % 86_400) / 3_600);
  return `${days}d ${hours}h`;
}
