import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRepositoryConnection,
  listDeveloperRepositories,
  listRepositoryConnections,
  updateRepositoryConnection
} from "./repository-settings.services";

export const repositoryConnectionsKey = ["devkit", "repository-connections"] as const;

export const useRepositoryConnections = () =>
  useQuery({ queryFn: listRepositoryConnections, queryKey: repositoryConnectionsKey });

export const useDeveloperRepositories = () =>
  useQuery({
    queryFn: listDeveloperRepositories,
    queryKey: [...repositoryConnectionsKey, "developer"]
  });

export function useRepositoryConnectionMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: repositoryConnectionsKey });
  return {
    create: useMutation({ mutationFn: createRepositoryConnection, onSuccess: refresh }),
    update: useMutation({
      mutationFn: ({
        id,
        input
      }: {
        id: string;
        input: Parameters<typeof updateRepositoryConnection>[1];
      }) => updateRepositoryConnection(id, input),
      onSuccess: refresh
    })
  };
}
