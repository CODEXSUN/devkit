import { Button } from "@codexsun/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, Link2, MessageCircle, Settings2, ShieldCheck, Smartphone } from "lucide-react";
import { useState } from "react";
import { beginTelegramConnection, disconnectTelegram, telegramStatus } from "./telegram-support.services";
import { TelegramTweakPanel } from "./telegram-tweak-panel";

export function TelegramConnectWorkspace() {
  const [compact, setCompact] = useState(false);
  const [deepLink, setDeepLink] = useState("");
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: ["telegram-status"], queryFn: telegramStatus, refetchInterval: 4000 });
  const connect = useMutation({ mutationFn: beginTelegramConnection, onSuccess: (value) => setDeepLink(value.deepLink) });
  const disconnect = useMutation({ mutationFn: disconnectTelegram, onSuccess: async () => { setDeepLink(""); await queryClient.invalidateQueries({ queryKey: ["telegram-status"] }); } });
  const connected = status.data?.connected ?? false;
  const configured = status.data?.configured ?? false;
  return <main className={`mx-auto flex w-full max-w-5xl flex-col ${compact ? "gap-5 p-5" : "gap-9 p-8 lg:p-12"}`}>
    <header className="flex flex-col gap-3">
      <span className="text-sm font-semibold text-sky-600">TELEGRAM SUPPORT</span>
      <h1 className="text-3xl font-semibold tracking-tight">Connect your mobile</h1>
      <p className="max-w-2xl text-base leading-7 text-muted-foreground">Link one Telegram account to start and stop DevKit tasks, receive task notifications, and continue support chats from your phone.</p>
    </header>
    <section className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-6 rounded-2xl bg-muted/40 p-6 lg:p-8">
        <div className="flex items-start gap-4"><div className="rounded-full bg-sky-100 p-3 text-sky-700"><Smartphone className="size-6" /></div><div className="flex flex-col gap-1"><h2 className="text-xl font-semibold">{connected ? "Mobile connected" : "Connect through Telegram"}</h2><p className="text-sm leading-6 text-muted-foreground">{connected ? `${status.data?.displayName || "Telegram user"}${status.data?.telegramUsername ? ` · @${status.data.telegramUsername}` : ""}` : "Open the bot on your phone and tap Start. The one-time link securely pairs this DevKit installation."}</p></div></div>
        {connected ? <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800"><CheckCircle2 className="size-5" /><span className="font-medium">Ready for task commands and notifications</span></div> : null}
        {!connected && status.data && !configured ? <div className="flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><div className="flex gap-3"><Settings2 className="mt-0.5 size-5 shrink-0" /><div><p className="font-medium">Finish Telegram bot setup</p><p className="mt-1 text-sm leading-6">Open BotFather in your browser, create or select the support bot, then add its token and username to the DevKit environment. A public HTTPS webhook URL is also required.</p></div></div><Button className="w-fit" variant="outline" asChild><a href="https://t.me/BotFather" target="_blank" rel="noreferrer">Open BotFather <ExternalLink className="size-4" /></a></Button></div> : null}
        {!connected && configured && !deepLink ? <Button className="w-fit" disabled={connect.isPending} onClick={() => connect.mutate()}><Link2 className="size-4" />Create mobile link</Button> : null}
        {!connected && deepLink ? <div className="flex flex-col gap-4"><div className="rounded-xl border bg-background p-4"><p className="text-sm font-medium">One-time connection link</p><p className="mt-1 break-all text-sm text-muted-foreground">{deepLink}</p></div><Button className="w-fit bg-sky-600 hover:bg-sky-700" asChild><a href={deepLink} target="_blank" rel="noreferrer">Open Telegram <ExternalLink className="size-4" /></a></Button><p className="text-xs text-muted-foreground">On mobile, tap Start in Telegram. This page detects the connection automatically.</p></div> : null}
        {connected ? <Button className="w-fit" variant="outline" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>Disconnect mobile</Button> : null}
        {(connect.error || status.error) ? <p className="text-sm text-destructive">{String((connect.error ?? status.error)?.message)}</p> : null}
      </div>
      <aside className="flex flex-col gap-5 pt-2"><Feature icon={ShieldCheck} title="Private pairing" text="A hashed one-time token pairs only the Telegram chat that opens it." /><Feature icon={MessageCircle} title="Useful commands" text="Use /tasks, /starttask task-id, /stoptask task-id, and /help." /></aside>
    </section>
    <TelegramTweakPanel compact={compact} onCompactChange={setCompact} />
  </main>;
}

function Feature({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) { return <div className="flex gap-3"><Icon className="mt-0.5 size-5 shrink-0 text-sky-600" /><div><h3 className="font-medium">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div></div>; }
