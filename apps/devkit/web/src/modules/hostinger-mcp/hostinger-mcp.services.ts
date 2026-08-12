import { apiGet, apiPost } from "../../shared/api/devkit-api";
import type { HostingerDashboard, HostingerMcpStatus, HostingerSshStatus, HostingerSshTarget } from "./hostinger-mcp.types";

export const getHostingerMcpStatus = () =>
  apiGet<HostingerMcpStatus>("/orchestration/integrations/hostinger/status");

export const configureHostingerMcp = () =>
  apiPost<HostingerMcpStatus>("/orchestration/integrations/hostinger/configure");

export const getHostingerDashboard = () =>
  apiGet<HostingerDashboard>("/orchestration/integrations/hostinger/dashboard");

export const getHostingerSshStatus = (target: HostingerSshTarget) =>
  apiGet<HostingerSshStatus>(`/orchestration/integrations/hostinger/ssh?${new URLSearchParams({
    host: target.host, name: target.name, port: String(target.port), user: target.user,
    virtualMachineId: String(target.virtualMachineId)
  })}`);

export const generateHostingerSshKey = (target: HostingerSshTarget) =>
  apiPost<HostingerSshStatus>("/orchestration/integrations/hostinger/ssh/generate", target);

export const testHostingerSsh = (target: HostingerSshTarget) =>
  apiPost<HostingerSshStatus>("/orchestration/integrations/hostinger/ssh/test", target);
