import { z } from "zod";
import { hostingerMcpClient } from "./hostinger-mcp.client.js";

const virtualMachineSchema = z.object({
  id: z.number().int(),
  hostname: z.string(),
  state: z.string(),
  plan: z.string(),
  cpus: z.number(),
  memory: z.number(),
  disk: z.number(),
  bandwidth: z.number(),
  created_at: z.string(),
  ipv4: z.array(z.object({ address: z.string() })),
  template: z.object({ name: z.string() })
});

const portSchema = z.object({
  type: z.string(),
  protocol: z.string(),
  host_ip: z.string().nullable(),
  host_port: z.number().nullable(),
  container_port: z.number(),
  host_port_start: z.number().nullable().optional(),
  host_port_end: z.number().nullable().optional(),
  container_port_start: z.number().nullable().optional(),
  container_port_end: z.number().nullable().optional()
});

const containerSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string(),
  status: z.string(),
  state: z.string(),
  health: z.string(),
  ports: z.array(portSchema)
});

const projectSchema = z.object({
  name: z.string(),
  status: z.string(),
  state: z.string(),
  path: z.string(),
  containers: z.array(containerSchema)
});

const metricSchema = z.object({ unit: z.string(), usage: z.record(z.string(), z.number()) });
const metricsSchema = z.object({
  cpu_usage: metricSchema,
  ram_usage: metricSchema,
  disk_space: metricSchema,
  incoming_traffic: metricSchema,
  outgoing_traffic: metricSchema,
  uptime: metricSchema
});

export class HostingerDashboardService {
  async dashboard() {
    const virtualMachines = z
      .array(virtualMachineSchema)
      .parse(await hostingerMcpClient.callTool("VPS_getVirtualMachinesV1", {}));
    const to = new Date();
    const from = new Date(to.getTime() - 6 * 60 * 60 * 1000);
    const nodes = await Promise.all(
      virtualMachines.map(async (virtualMachine) => {
        const [projects, metrics] = await Promise.all([
          this.projects(virtualMachine.id),
          this.metrics(virtualMachine.id, from, to)
        ]);
        return buildNode(virtualMachine, projects, metrics);
      })
    );
    return { generatedAt: to.toISOString(), nodes };
  }

  private async projects(virtualMachineId: number) {
    return z
      .array(projectSchema)
      .parse(await hostingerMcpClient.callTool("VPS_getProjectListV1", { virtualMachineId }));
  }

  private async metrics(virtualMachineId: number, from: Date, to: Date) {
    return metricsSchema.parse(
      await hostingerMcpClient.callTool("VPS_getMetricsV1", {
        virtualMachineId,
        date_from: from.toISOString(),
        date_to: to.toISOString()
      })
    );
  }
}

function buildNode(
  virtualMachine: z.infer<typeof virtualMachineSchema>,
  projects: z.infer<typeof projectSchema>[],
  metrics: z.infer<typeof metricsSchema>
) {
  const containers = projects.flatMap((project) => project.containers);
  const unhealthy = containers.filter(
    (container) =>
      container.state !== "running" || !["", "healthy", "not configured"].includes(container.health)
  ).length;
  return {
    id: virtualMachine.id,
    hostname: virtualMachine.hostname,
    state: virtualMachine.state,
    plan: virtualMachine.plan,
    operatingSystem: virtualMachine.template.name,
    ipv4: virtualMachine.ipv4[0]?.address ?? "",
    createdAt: virtualMachine.created_at,
    capacity: {
      cpuCores: virtualMachine.cpus,
      memoryBytes: virtualMachine.memory * 1024 * 1024,
      diskBytes: virtualMachine.disk * 1024 * 1024,
      bandwidthBytes: virtualMachine.bandwidth * 1024 * 1024
    },
    health: deriveHealth(virtualMachine.state, unhealthy, metrics),
    metrics: {
      cpu: normalizeMetric(metrics.cpu_usage, virtualMachine.cpus ? 100 : null),
      memory: normalizeMetric(metrics.ram_usage, virtualMachine.memory * 1024 * 1024),
      disk: normalizeMetric(metrics.disk_space, virtualMachine.disk * 1024 * 1024),
      incomingTraffic: normalizeMetric(metrics.incoming_traffic, null),
      outgoingTraffic: normalizeMetric(metrics.outgoing_traffic, null),
      uptime: normalizeMetric(metrics.uptime, null)
    },
    summary: {
      projectCount: projects.length,
      containerCount: containers.length,
      runningCount: containers.filter((container) => container.state === "running").length,
      unhealthyCount: unhealthy
    },
    projects: projects.map(normalizeProject)
  };
}

function normalizeProject(project: z.infer<typeof projectSchema>) {
  return {
    name: project.name,
    status: project.status,
    state: project.state,
    containers: project.containers.map((container) => ({
      id: container.id,
      name: container.name,
      image: container.image,
      version: imageVersion(container.image),
      status: container.status,
      state: container.state,
      health: container.health || "not configured",
      ports: container.ports.map(formatPort)
    }))
  };
}

function normalizeMetric(metric: z.infer<typeof metricSchema>, capacity: number | null) {
  const points = Object.entries(metric.usage)
    .map(([timestamp, value]) => ({ timestamp: Number(timestamp) * 1000, value }))
    .sort((left, right) => left.timestamp - right.timestamp);
  const current = points.at(-1)?.value ?? 0;
  return {
    unit: metric.unit,
    current,
    percent: capacity ? Math.min(100, (current / capacity) * 100) : null,
    points
  };
}

function deriveHealth(state: string, unhealthy: number, metrics: z.infer<typeof metricsSchema>) {
  if (state !== "running") return "offline" as const;
  const cpu = Object.values(metrics.cpu_usage.usage).at(-1) ?? 0;
  if (unhealthy || cpu >= 90) return "attention" as const;
  return "healthy" as const;
}

function formatPort(port: z.infer<typeof portSchema>) {
  const target = `${port.container_port}/${port.protocol}`;
  return port.host_port ? `${port.host_ip ?? "*"}:${port.host_port} -> ${target}` : target;
}

function imageVersion(image: string) {
  const separator = image.lastIndexOf(":");
  return separator > image.lastIndexOf("/") ? image.slice(separator + 1) : "latest";
}

export const hostingerDashboardService = new HostingerDashboardService();
