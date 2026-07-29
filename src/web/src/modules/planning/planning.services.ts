import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from "../../shared/api/devkit-api";
import type { PlanningBoard, PlanningScene } from "./planning.types";

export const listPlanningBoards = () =>
  apiGet<PlanningBoard[]>("/planning/boards");
export const getPlanningBoard = (uuid: string) =>
  apiGet<PlanningBoard>(`/planning/boards/${uuid}`);
export const createPlanningBoard = (input: {
  description: string;
  projectUuid: string | null;
  title: string;
}) => apiPost<PlanningBoard>("/planning/boards", input);
export const updatePlanningBoard = (
  uuid: string,
  input: {
    scene?: PlanningScene;
    title?: string;
    description?: string;
    projectUuid?: string | null;
  },
) => apiPut<PlanningBoard>(`/planning/boards/${uuid}`, input);
export const deletePlanningBoard = (uuid: string) =>
  apiDelete<{ deleted: true; uuid: string }>(`/planning/boards/${uuid}`);
