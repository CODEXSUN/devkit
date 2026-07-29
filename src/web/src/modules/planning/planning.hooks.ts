import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPlanningBoard,
  deletePlanningBoard,
  getPlanningBoard,
  listPlanningBoards,
  updatePlanningBoard,
} from "./planning.services";

const boardsKey = ["devkit", "planning", "boards"] as const;
export const usePlanningBoards = () =>
  useQuery({ queryKey: boardsKey, queryFn: listPlanningBoards });
export const usePlanningBoard = (uuid: string) =>
  useQuery({
    queryKey: [...boardsKey, uuid],
    queryFn: () => getPlanningBoard(uuid),
    enabled: Boolean(uuid),
  });
export function usePlanningActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: boardsKey });
  return {
    create: useMutation({
      mutationFn: createPlanningBoard,
      onSuccess: refresh,
    }),
    delete: useMutation({
      mutationFn: deletePlanningBoard,
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({
        uuid,
        input,
      }: {
        uuid: string;
        input: Parameters<typeof updatePlanningBoard>[1];
      }) => updatePlanningBoard(uuid, input),
      onSuccess: refresh,
    }),
  };
}
