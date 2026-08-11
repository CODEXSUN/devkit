import { Button } from "@codexsun/ui/components/button";
import {
  CheckCircle2Icon,
  CircleIcon,
  Clock3Icon,
  CopyIcon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  LogOutIcon,
  TerminalIcon
} from "lucide-react";
import type { BrowserLogin, CodexStatus, DeviceLogin } from "./launch-desk.types";

type Props = {
  deviceLogin: DeviceLogin | null;
  browserLogin: BrowserLogin | null;
  onCancelBrowserLogin: () => void;
  onBrowserConnect: () => void;
  onDeviceConnect: () => void;
  onDisconnect: () => void;
  pending: boolean;
  status?: CodexStatus;
  checkedAt?: number;
};

export function CodexConnection({
  checkedAt,
  browserLogin,
  deviceLogin,
  onCancelBrowserLogin,
  onBrowserConnect,
  onDeviceConnect,
  onDisconnect,
  pending,
  status
}: Props) {
  const connected = status?.connected ?? false;
  return (
    <section className="flex min-h-16 flex-col gap-3 border-b px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-muted/30">
          <TerminalIcon className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold leading-tight">Codex</h2>
          <p className="truncate text-sm text-muted-foreground">Independent local runtime</p>
        </div>
      </div>
      {connected ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <div className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2Icon className="size-4" /> Connected
          </div>
          <span className="max-w-64 truncate text-foreground">
            {status?.email ?? "Authenticated account"}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium uppercase tracking-wide">
            {status?.planType ?? status?.accountType ?? "ChatGPT"}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock3Icon className="size-3.5" /> Checked {formatCheckedAt(checkedAt)}
          </span>
          <Button onClick={onDisconnect} size="sm" variant="ghost">
            <LogOutIcon /> Disconnect
          </Button>
        </div>
      ) : browserLogin ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <LoaderCircleIcon className="size-4 animate-spin" /> Finish sign-in in your browser
          </span>
          <Button onClick={onCancelBrowserLogin} size="sm" variant="ghost">
            Cancel
          </Button>
        </div>
      ) : deviceLogin ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <LoaderCircleIcon className="size-4 animate-spin" /> Awaiting approval
          </span>
          <button
            className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 font-mono font-semibold tracking-[0.14em]"
            onClick={() => void navigator.clipboard.writeText(deviceLogin.userCode)}
            type="button"
          >
            {deviceLogin.userCode}
            <CopyIcon className="size-4" />
          </button>
          <Button size="sm"
            onClick={() =>
              window.open(deviceLogin.verificationUrl, "_blank", "noopener,noreferrer")
            }
          >
            <ExternalLinkIcon /> Open authentication page
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <CircleIcon className="size-3.5 fill-current" /> Disconnected
          </span>
          {checkedAt ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock3Icon className="size-3.5" /> Checked {formatCheckedAt(checkedAt)}
            </span>
          ) : null}
          {status?.error ? <span className="text-destructive">{status.error}</span> : null}
          <Button disabled={pending} onClick={onBrowserConnect} size="sm">
            <ExternalLinkIcon />
            Connect in browser
          </Button>
          <Button
            disabled={pending}
            onClick={onDeviceConnect}
            size="sm"
            variant="outline"
          >
            {pending ? <LoaderCircleIcon className="animate-spin" /> : <TerminalIcon />}
            Use device code
          </Button>
        </div>
      )}
    </section>
  );
}

function formatCheckedAt(value?: number) {
  if (!value) return "just now";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
