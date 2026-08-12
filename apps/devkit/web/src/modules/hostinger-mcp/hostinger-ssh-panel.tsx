import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, KeyRoundIcon, LoaderCircleIcon, PlugZapIcon, ShieldCheckIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { generateHostingerSshKey, getHostingerSshStatus, testHostingerSsh } from "./hostinger-mcp.services";
import type { HostingerNode, HostingerSshTarget } from "./hostinger-mcp.types";

export function HostingerSshPanel({ node }: { node: HostingerNode }) {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<HostingerSshTarget>({
    host: node.ipv4 || node.hostname,
    name: `codelogicx-devkit-${node.id}`,
    port: 22,
    user: "root",
    virtualMachineId: node.id
  });
  const statusKey = ["devkit", "hostinger-ssh", target] as const;
  const status = useQuery({ queryKey: statusKey, queryFn: () => getHostingerSshStatus(target) });
  const generate = useMutation({
    mutationFn: () => generateHostingerSshKey(target),
    onSuccess: (result) => {
      queryClient.setQueryData(statusKey, result);
      toast.success("SSH key generated and attached to Hostinger.");
    },
    onError: (error) => toast.error(error.message)
  });
  const test = useMutation({
    mutationFn: () => testHostingerSsh(target),
    onSuccess: (result) => {
      queryClient.setQueryData(statusKey, result);
      if (result.connected) toast.success("SSH connection verified.");
      else toast.error(result.lastError ?? "SSH connection failed.");
    },
    onError: (error) => toast.error(error.message)
  });
  const busy = generate.isPending || test.isPending;
  const result = status.data;

  return <section className="mt-6 rounded-2xl border bg-card shadow-sm">
    <header className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-800"><KeyRoundIcon className="size-5" /></span><div><h2 className="font-semibold">Hostinger SSH connection</h2><p className="text-xs text-muted-foreground">Generate an Ed25519 key, attach its public half, and verify server access.</p></div></div>
      <ConnectionBadge connected={result?.connected ?? false} generated={result?.generated ?? false} />
    </header>
    <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto]">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Host"><Input aria-label="SSH host" value={target.host} onChange={(event) => setTarget({ ...target, host: event.target.value })} /></Field>
        <Field label="User"><Input aria-label="SSH user" value={target.user} onChange={(event) => setTarget({ ...target, user: event.target.value })} /></Field>
        <Field label="Port"><Input aria-label="SSH port" min={1} max={65535} type="number" value={target.port} onChange={(event) => setTarget({ ...target, port: Number(event.target.value) })} /></Field>
        <Field label="Key name"><Input aria-label="SSH key name" value={target.name} onChange={(event) => setTarget({ ...target, name: event.target.value })} /></Field>
      </div>
      <div className="flex items-end gap-2">
        <Button disabled={busy} onClick={() => generate.mutate()} variant="outline">{generate.isPending ? <LoaderCircleIcon className="animate-spin" /> : <KeyRoundIcon />}Generate and attach</Button>
        <Button disabled={busy || !result?.generated} onClick={() => test.mutate()}>{test.isPending ? <LoaderCircleIcon className="animate-spin" /> : <PlugZapIcon />}Test SSH</Button>
      </div>
    </div>
    {result?.fingerprint || result?.lastError || result?.evidence ? <div aria-live="polite" className="mx-5 mb-5 rounded-xl bg-muted/50 p-4 text-sm"><div className="flex items-center gap-2 font-medium"><ShieldCheckIcon className="size-4 text-emerald-600" />Private key protected by the DevKit server</div>{result.fingerprint ? <p className="break-all pt-2 text-xs text-muted-foreground">Fingerprint: {result.fingerprint}</p> : null}{result.connected && result.evidence ? <p className="pt-2 text-emerald-700">Connected to {result.evidence.host} as {result.evidence.user}. `/home/devkit` is {result.evidence.devkitPath}.</p> : null}{result.lastError ? <p className="pt-2 text-sm text-destructive">{result.lastError}</p> : null}</div> : null}
  </section>;
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label className="grid gap-1.5 text-xs font-medium text-muted-foreground"><span>{label}</span>{children}</label>;
}

function ConnectionBadge({ connected, generated }: { connected: boolean; generated: boolean }) {
  const label = connected ? "SSH connected" : generated ? "Key ready" : "Not configured";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${connected ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{connected ? <CheckCircle2Icon className="size-3.5" /> : <KeyRoundIcon className="size-3.5" />}{label}</span>;
}
