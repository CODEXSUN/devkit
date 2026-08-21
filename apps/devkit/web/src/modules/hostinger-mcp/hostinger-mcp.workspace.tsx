import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/input";
import {
  CircleAlertIcon,
  KeyRoundIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  ServerCogIcon
} from "lucide-react";
import { toast } from "sonner";
import { HostingerDashboard } from "./hostinger-dashboard";
import { HostingerSshPanel } from "./hostinger-ssh-panel";
import {
  configureHostingerMcp,
  getHostingerDashboard,
  getHostingerMcpStatus,
  saveHostingerCredential
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
  const saveCredential = useMutation({
    mutationFn: saveHostingerCredential,
    onSuccess: async (result) => {
      queryClient.setQueryData(["devkit", "hostinger-mcp", "status"], result);
      await dashboard.refetch();
      toast.success("Hostinger credential saved and connected.");
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
        <>
          <HostingerDashboard dashboard={dashboard.data} />
          {dashboard.data.nodes[0] ? <HostingerSshPanel node={dashboard.data.nodes[0]} /> : null}
        </>
      ) : (
        <ConnectionState
          configured={status.data?.configured ?? false}
          configuring={configure.isPending}
          error={dashboard.error?.message ?? status.error?.message ?? status.data?.error ?? null}
          loading={loading}
          onConfigure={() => configure.mutate()}
          onSaveCredential={(token) => saveCredential.mutateAsync(token)}
          savingCredential={saveCredential.isPending}
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
  onSaveCredential,
  savingCredential,
  tokenConfigured
}: {
  configured: boolean;
  configuring: boolean;
  error: string | null;
  loading: boolean;
  onConfigure: () => void;
  onSaveCredential: (token: string) => Promise<unknown>;
  savingCredential: boolean;
  tokenConfigured: boolean;
}) {
  const [token, setToken] = useState("");
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
          : "Enter a Hostinger API token to connect this server to your VPS account."}
      </p>
      {!tokenConfigured ? (
        <form
          className="mx-auto flex max-w-lg flex-col gap-3 pt-6 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void onSaveCredential(token).then(() => setToken(""));
          }}
        >
          <label className="sr-only" htmlFor="hostinger-api-token">
            Hostinger API token
          </label>
          <Input
            autoComplete="off"
            className="h-10 flex-1"
            id="hostinger-api-token"
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste Hostinger API token"
            required
            spellCheck={false}
            type="password"
            value={token}
          />
          <Button disabled={savingCredential || !token.trim()} type="submit">
            {savingCredential ? <LoaderCircleIcon className="animate-spin" /> : <KeyRoundIcon />}
            Save and connect
          </Button>
        </form>
      ) : null}
      {!tokenConfigured ? (
        <p className="pt-3 text-xs text-muted-foreground">
          Saved only to the server environment. The token is never returned to the browser.
        </p>
      ) : null}
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
