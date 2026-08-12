import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@codexsun/ui/components/button";
import {
  CircleAlertIcon,
  KeyRoundIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  ServerCogIcon
} from "lucide-react";
import { toast } from "sonner";
import { HostingerDashboard } from "./hostinger-dashboard";
import {
  configureHostingerMcp,
  getHostingerDashboard,
  getHostingerMcpStatus
} from "./hostinger-mcp.services";

export function HostingerMcpWorkspace() {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ["devkit", "hostinger-mcp", "status"],
    queryFn: getHostingerMcpStatus,
    refetchInterval: 60_000
  });
  const dashboard = useQuery({
    queryKey: ["devkit", "hostinger-mcp", "dashboard"],
    queryFn: getHostingerDashboard,
    enabled: status.data?.tokenConfigured === true,
    refetchInterval: 60_000
  });
  const configure = useMutation({
    mutationFn: configureHostingerMcp,
    onSuccess: async (result) => {
      queryClient.setQueryData(["devkit", "hostinger-mcp", "status"], result);
      await dashboard.refetch();
      toast.success("Hostinger MCP configured.");
    },
    onError: (error) => toast.error(error.message)
  });

  const refresh = async () => {
    await Promise.all([status.refetch(), dashboard.refetch()]);
  };
  const loading = status.isLoading || dashboard.isLoading;

  return (
    <main className="mx-auto w-full max-w-[92rem] px-5 py-7 lg:px-8">
      <header className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ServerCogIcon className="size-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Hostinger infrastructure</h1>
              {dashboard.data ? (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  Live
                </span>
              ) : null}
            </div>
            <p className="pt-1 text-sm text-muted-foreground">
              VPS health, Hostinger metrics, Docker projects and container status.
            </p>
          </div>
        </div>
        <Button disabled={loading} onClick={() => void refresh()} size="sm" variant="outline">
          <RefreshCwIcon
            className={status.isFetching || dashboard.isFetching ? "animate-spin" : ""}
          />
          Refresh
        </Button>
      </header>

      {dashboard.data ? (
        <HostingerDashboard dashboard={dashboard.data} />
      ) : (
        <ConnectionState
          configured={status.data?.configured ?? false}
          configuring={configure.isPending}
          error={dashboard.error?.message ?? status.error?.message ?? status.data?.error ?? null}
          loading={loading}
          onConfigure={() => configure.mutate()}
          tokenConfigured={status.data?.tokenConfigured ?? false}
        />
      )}
    </main>
  );
}

function ConnectionState({
  configured,
  configuring,
  error,
  loading,
  onConfigure,
  tokenConfigured
}: {
  configured: boolean;
  configuring: boolean;
  error: string | null;
  loading: boolean;
  onConfigure: () => void;
  tokenConfigured: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-24 text-sm text-muted-foreground">
        <LoaderCircleIcon className="size-5 animate-spin" /> Loading Hostinger infrastructure
      </div>
    );
  }
  return (
    <section className="mx-auto max-w-2xl py-16 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-xl bg-muted">
        {tokenConfigured ? (
          <ServerCogIcon className="size-5" />
        ) : (
          <KeyRoundIcon className="size-5" />
        )}
      </span>
      <h2 className="pt-5 text-xl font-semibold">
        {tokenConfigured ? "Connect the Hostinger runtime" : "Hostinger credential is missing"}
      </h2>
      <p className="mx-auto max-w-lg pt-2 text-sm leading-6 text-muted-foreground">
        {tokenConfigured
          ? "Install the managed MCP configuration, then load live VPS and Docker information."
          : "Add HOSTINGER_API_TOKEN to the backend .env and restart the API. The credential is never returned to this page."}
      </p>
      {error ? (
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-destructive">
          <CircleAlertIcon className="size-4" /> {error}
        </p>
      ) : null}
      {tokenConfigured ? (
        <Button className="mt-6" disabled={configuring} onClick={onConfigure}>
          {configuring ? <LoaderCircleIcon className="animate-spin" /> : <ServerCogIcon />}
          {configured ? "Reload connection" : "Configure connection"}
        </Button>
      ) : null}
    </section>
  );
}
