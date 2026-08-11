import { apiGet } from "../../shared/api/devkit-api";
import type { OrchestrationCatalog } from "./orchestration.types";

export function getOrchestrationCatalog() {
  return apiGet<OrchestrationCatalog>("/orchestration/catalog");
}
