import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createAgentIdePlan,
  getAgentIdeSettings,
  testAgentIdeConnection
} from "./agent-ide.services";

export const agentIdeSettingsKey = ["devkit", "agent-ide", "settings"] as const;

export function useAgentIdeSettings() {
  return useQuery({ queryFn: getAgentIdeSettings, queryKey: agentIdeSettingsKey });
}

export function useAgentIdeActions() {
  return {
    plan: useMutation({ mutationFn: createAgentIdePlan }),
    test: useMutation({ mutationFn: testAgentIdeConnection })
  };
}
