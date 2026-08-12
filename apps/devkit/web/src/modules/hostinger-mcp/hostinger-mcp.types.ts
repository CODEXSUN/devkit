export type HostingerMcpStatus = {
  configured: boolean;
  connected: boolean;
  error: string | null;
  packageName: string;
  serverName: string;
  tokenConfigured: boolean;
  toolCount: number | null;
};

export type HostingerMetric = {
  unit: string;
  current: number;
  percent: number | null;
  points: Array<{ timestamp: number; value: number }>;
};

export type HostingerContainer = {
  id: string;
  name: string;
  image: string;
  version: string;
  status: string;
  state: string;
  health: string;
  ports: string[];
};

export type HostingerProject = {
  name: string;
  status: string;
  state: string;
  containers: HostingerContainer[];
};

export type HostingerNode = {
  id: number;
  hostname: string;
  ipv4: string;
  state: string;
  plan: string;
  operatingSystem: string;
  createdAt: string;
  capacity: {
    cpuCores: number;
    memoryBytes: number;
    diskBytes: number;
    bandwidthBytes: number;
  };
  health: "healthy" | "attention" | "offline";
  metrics: {
    cpu: HostingerMetric;
    memory: HostingerMetric;
    disk: HostingerMetric;
    incomingTraffic: HostingerMetric;
    outgoingTraffic: HostingerMetric;
    uptime: HostingerMetric;
  };
  summary: {
    projectCount: number;
    containerCount: number;
    runningCount: number;
    unhealthyCount: number;
  };
  projects: HostingerProject[];
};

export type HostingerSshTarget = {
  host: string;
  name: string;
  port: number;
  user: string;
  virtualMachineId: number;
};

export type HostingerSshStatus = HostingerSshTarget & {
  attached: boolean;
  connected: boolean;
  evidence?: Record<string, string> | null;
  fingerprint: string | null;
  generated: boolean;
  keyName: string;
  lastError: string | null;
};

export type HostingerDashboard = {
  generatedAt: string;
  nodes: HostingerNode[];
};
