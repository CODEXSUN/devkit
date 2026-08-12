import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RadioTowerIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CodexConnection } from "./codex-connection";
import {
  CodexConnectionHistory,
  useCodexConnectionHistory
} from "./codex-connection-history";
import {
  cancelCodexLogin,
  getCodexStatus,
  logoutCodex,
  startCodexBrowserLogin,
  startCodexDeviceLogin
} from "./launch-desk.services";
import type { BrowserLogin, DeviceLogin } from "./launch-desk.types";

export function LaunchDeskWorkspace() {
  const queryClient = useQueryClient();
  const [deviceLogin, setDeviceLogin] = useState<DeviceLogin | null>(null);
  const [browserLogin, setBrowserLogin] = useState<BrowserLogin | null>(null);
  const status = useQuery({
    queryKey: ["devkit", "codex", "status"],
    queryFn: getCodexStatus,
    refetchInterval: deviceLogin || browserLogin ? 2000 : 30_000
  });
  const history = useCodexConnectionHistory(status.data, status.dataUpdatedAt || undefined);

  useEffect(() => {
    if (status.data?.connected) {
      setDeviceLogin(null);
      setBrowserLogin(null);
    }
  }, [status.data?.connected]);

  const connect = useMutation({
    mutationFn: startCodexDeviceLogin,
    onSuccess: setDeviceLogin,
    onError: (error) => toast.error(error.message)
  });
  const browserConnect = useMutation({
    mutationFn: startCodexBrowserLogin,
    onError: (error) => {
      setBrowserLogin(null);
      toast.error(error.message);
    }
  });
  const cancelBrowserConnect = useMutation({
    mutationFn: cancelCodexLogin,
    onSuccess: () => setBrowserLogin(null),
    onError: (error) => toast.error(error.message)
  });
  const disconnect = useMutation({
    mutationFn: logoutCodex,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["devkit", "codex"] })
  });

  const openBrowserLogin = () => {
    const loginWindow = window.open("about:blank", "_blank");
    browserConnect.mutate(undefined, {
      onSuccess: (login) => {
        setBrowserLogin(login);
        if (loginWindow) loginWindow.location.href = login.authUrl;
        else window.location.href = login.authUrl;
      },
      onError: () => loginWindow?.close()
    });
  };

  return (
    <main className="flex h-[calc(100dvh-3.5rem)] min-h-[36rem] flex-col overflow-hidden bg-background">
      <header className="flex items-center gap-3 border-b px-5 py-4">
        <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
          <RadioTowerIcon className="size-4" />
        </span>
        <div>
          <h1 className="text-lg font-semibold leading-tight">Agent Connector</h1>
          <p className="text-sm text-muted-foreground">Independent ChatGPT device authorization</p>
        </div>
      </header>
      <CodexConnection
        browserLogin={browserLogin}
        deviceLogin={deviceLogin}
        onBrowserConnect={openBrowserLogin}
        onCancelBrowserLogin={() => {
          if (browserLogin) cancelBrowserConnect.mutate(browserLogin.loginId);
        }}
        onDeviceConnect={() => connect.mutate()}
        onDisconnect={() => disconnect.mutate()}
        pending={connect.isPending}
        {...(status.dataUpdatedAt ? { checkedAt: status.dataUpdatedAt } : {})}
        {...(status.data ? { status: status.data } : {})}
      />
      <CodexConnectionHistory records={history} />
    </main>
  );
}
