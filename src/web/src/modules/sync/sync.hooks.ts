import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bindSyncCloud,
  generateSyncToken,
  getSyncStatus,
  publishSyncCloud,
  pullSyncCloud,
} from "./sync.services";

export const syncStatusKey = ["devkit", "sync", "status"] as const;

export function useSyncStatus() {
  return useQuery({
    queryFn: getSyncStatus,
    queryKey: syncStatusKey,
    refetchOnWindowFocus: false,
  });
}

export function useSyncActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: syncStatusKey });
  return {
    bind: useMutation({
      mutationFn: ({
        instanceId,
        token,
      }: {
        instanceId: string;
        token: string;
      }) => bindSyncCloud(instanceId, token),
      onSuccess: refresh,
    }),
    generate: useMutation({ mutationFn: generateSyncToken }),
    publish: useMutation({
      mutationFn: publishSyncCloud,
      onSuccess: refresh,
    }),
    pull: useMutation({
      mutationFn: pullSyncCloud,
      onSuccess: refresh,
    }),
  };
}
