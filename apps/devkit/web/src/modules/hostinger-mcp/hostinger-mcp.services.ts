import { apiGet, apiPost } from "../../shared/api/devkit-api";
import type { HostingerDashboard, HostingerMcpStatus } from "./hostinger-mcp.types";

export const getHostingerMcpStatus = () =>
  apiGet<HostingerMcpStatus>("/orchestration/integrations/hostinger/status");

export const configureHostingerMcp = () =>
  apiPost<HostingerMcpStatus>("/orchestration/integrations/hostinger/configure");

export const getHostingerDashboard = () =>
  apiGet<HostingerDashboard>("/orchestration/integrations/hostinger/dashboard");
