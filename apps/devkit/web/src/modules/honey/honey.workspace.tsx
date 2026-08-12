import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/input";
import { notifyHoneyConversation, type HoneyConversationState } from "@codexsun/ui/lib/honey-conversation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpIcon, AudioWaveformIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, PlusIcon, SparklesIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { HoneyMessageBubble, HoneyThinking } from "./honey-message";
import { HoneyFace } from "./honey-face";
import { getHoneyConversation, listHoneyConversations, sendHoneyMessage } from "./honey.services";
import { useHoneyVoice } from "./use-honey-voice";

export function HoneyWorkspace() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [startingNew, setStartingNew] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [message, setMessage] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");
  const [animatedMessageId, setAnimatedMessageId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const conversations = useQuery({ queryKey: ["honey", "conversations"], queryFn: listHoneyConversations });
  const activeId = startingNew ? null : (threadId ?? conversations.data?.[0]?.id ?? null);
  const conversation = useQuery({ queryKey: ["honey", "conversation", activeId], queryFn: () => getHoneyConversation(activeId!), enabled: Boolean(activeId) });
  const send = useMutation({
    mutationFn: (body: string) => sendHoneyMessage(body, activeId),
    onSuccess: async (data) => {
      setThreadId(data.id); setStartingNew(false); setPendingMessage("");
      setAnimatedMessageId([...data.messages].reverse().find((item) => item.role === "assistant")?.id ?? null);
      queryClient.setQueryData(["honey", "conversation", data.id], data);
      await queryClient.invalidateQueries({ queryKey: ["honey", "conversations"] });
    }
  });
  const voice = useHoneyVoice(setMessage, submitBody);
  const reaction: HoneyConversationState = voice.listening ? "listening" : send.isPending ? "thinking" : animatedMessageId ? "answered" : "idle";
  const scrollToLatest = () => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  useEffect(() => {
    scrollToLatest();
  }, [conversation.data?.messages, send.isPending]);
  useEffect(() => {
    notifyHoneyConversation(reaction);
  }, [reaction]);
  useEffect(() => () => notifyHoneyConversation("inactive"), []);
  useEffect(() => {
    if (!animatedMessageId) return;
    const timeout = window.setTimeout(() => setAnimatedMessageId(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [animatedMessageId]);

  function submit() {
    submitBody(message);
  }

  function submitBody(value: string) {
    const body = value.trim();
    if (!body || send.isPending) return;
    setMessage(""); setPendingMessage(body); setAnimatedMessageId(null); send.mutate(body);
  }

  return <main className="flex h-[calc(100svh-7rem)] min-h-[34rem] bg-background">
    {drawerOpen ? <ConversationDrawer activeId={activeId} conversations={conversations.data ?? []} onClose={() => setDrawerOpen(false)} onNew={() => { setStartingNew(true); setThreadId(null); setAnimatedMessageId(null); }} onSelect={(id) => { setStartingNew(false); setThreadId(id); setAnimatedMessageId(null); }} /> : null}
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-16 items-center gap-3 border-b px-4 sm:px-5">
        {!drawerOpen ? <Button aria-label="Show conversations" className="size-9 rounded-full" onClick={() => setDrawerOpen(true)} size="icon" variant="ghost"><PanelLeftOpenIcon /></Button> : null}
        <HoneyFace size="header" />
        <div className="min-w-0"><h1 className="truncate font-semibold">Honey</h1><p className="truncate text-xs text-muted-foreground">Honey is here to help · What&apos;s next?</p></div>
        <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 sm:flex dark:bg-emerald-950/30 dark:text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-500" />Connected to Honey</span>
      </header>
      <motion.div aria-live="polite" className="flex flex-1 flex-col gap-4 overflow-y-auto scroll-smooth px-4 py-6 sm:px-[max(1rem,calc((100%-48rem)/2))]" layoutScroll>
        {!conversation.data?.messages.length && !send.isPending ? <Welcome /> : null}
        <AnimatePresence initial={false}>{(conversation.data?.messages ?? []).map((item) => <HoneyMessageBubble animateAnswer={item.id === animatedMessageId} item={item} key={item.id} onProgress={scrollToLatest} onPrompt={setMessage} />)}</AnimatePresence>
        <AnimatePresence>{send.isPending && pendingMessage ? <HoneyMessageBubble item={{ body: pendingMessage, createdAt: new Date().toISOString(), id: "pending", role: "user" }} /> : null}</AnimatePresence>
        <AnimatePresence>{send.isPending ? <HoneyThinking /> : null}</AnimatePresence>
        <div ref={endRef}/>
      </motion.div>
      <Composer error={voice.error || send.error} listening={voice.listening} message={message} onChange={setMessage} onSubmit={submit} onVoice={voice.toggle} pending={send.isPending} voiceSupported={voice.supported} />
    </section>
  </main>;
}

function Composer({ error, listening, message, onChange, onSubmit, onVoice, pending, voiceSupported }: { error: unknown; listening: boolean; message: string; onChange: (value: string) => void; onSubmit: () => void; onVoice: () => void; pending: boolean; voiceSupported: boolean }) {
  return <form className="mx-auto w-full max-w-3xl border-t p-4" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><div className="flex items-center gap-2 rounded-full border bg-background p-1.5 pl-4 shadow-sm transition focus-within:border-amber-300 focus-within:shadow-md focus-within:ring-2 focus-within:ring-amber-300/40"><Input aria-label="Message Honey" autoComplete="off" className="h-9 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" disabled={pending} placeholder={listening ? "Listening…" : "Ask Honey anything…"} value={message} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); onSubmit(); } }} /><Button aria-label={listening ? "Stop voice typing" : "Start voice typing"} className={`size-9 shrink-0 rounded-full ${listening ? "bg-amber-100 text-amber-800" : ""}`} disabled={!voiceSupported || pending} onClick={onVoice} size="icon" title={voiceSupported ? "Speak to Honey" : "Voice typing is not supported in this browser"} type="button" variant="ghost"><AudioWaveformIcon className={listening ? "animate-pulse" : ""} /></Button><Button aria-label="Send to Honey" className="size-9 shrink-0 rounded-full bg-amber-500 p-0 text-stone-950 transition hover:scale-105 hover:bg-amber-400 active:scale-95" disabled={!message.trim() || pending} size="icon" type="submit"><ArrowUpIcon /></Button></div>{error ? <p className="px-4 pt-2 text-xs text-red-600">{error instanceof Error ? error.message : String(error)}</p> : null}</form>;
}

function ConversationDrawer({ activeId, conversations, onClose, onNew, onSelect }: { activeId: string | null; conversations: Array<{ id: string; title: string }>; onClose: () => void; onNew: () => void; onSelect: (id: string) => void }) {
  return <motion.aside animate={{ opacity: 1, width: 288 }} className="flex shrink-0 flex-col overflow-hidden border-r bg-muted/15 p-3" initial={{ opacity: 0, width: 0 }}><div className="flex gap-2"><Button className="flex-1 justify-start gap-2 rounded-xl" onClick={onNew} variant="outline"><PlusIcon /> New conversation</Button><Button aria-label="Hide conversations" className="shrink-0 rounded-xl" onClick={onClose} size="icon" variant="ghost"><PanelLeftCloseIcon /></Button></div><div className="mt-3 space-y-1 overflow-y-auto">{conversations.map((item) => <button className={`w-full truncate rounded-xl px-3 py-2.5 text-left text-sm transition ${activeId === item.id ? "bg-amber-50 font-medium dark:bg-amber-950/30" : "hover:bg-muted"}`} key={item.id} onClick={() => onSelect(item.id)} type="button">{item.title}</button>)}</div></motion.aside>;
}

function Welcome() {
  return <motion.div animate={{ opacity: 1, y: 0 }} className="m-auto max-w-md text-center" initial={{ opacity: 0, y: 10 }}><SparklesIcon className="mx-auto size-8 text-amber-600"/><h2 className="pt-3 text-xl font-semibold">Honey is here to help</h2><p className="pt-2 text-sm text-muted-foreground">Ask a question, describe what you need, or use your voice. What would you like to do next?</p></motion.div>;
}
