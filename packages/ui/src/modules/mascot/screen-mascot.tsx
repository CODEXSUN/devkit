"use client";

import { animate, motion, useMotionValue } from "framer-motion";
import { useEffect, useRef, useState, type KeyboardEvent, type MutableRefObject, type PointerEvent } from "react";
import { AudioWaveformIcon } from "lucide-react";

import { getHoneyConversationState, honeyConversationEvent, type HoneyConversationState } from "../../lib/honey-conversation";
import { mascotStorage, type MascotBehavior, type MascotChatConversation, type MascotMode, type Position, type ScreenCompanionConfig } from "./mascot.contract";
import { MascotControls } from "./mascot-controls";
import { MascotChat } from "./mascot-chat";
import { bottomEdge, clampPosition, HOME_X, nextRoamingPosition, rightEdge, travelDuration, walkingMode } from "./mascot-motion";
import { MascotSprite } from "./mascot-sprite";
import { MascotStatus, type MascotStatusPlacement } from "./mascot-status";
import { useMascotVoice } from "./use-mascot-voice";

type ScreenMascotProps = ScreenCompanionConfig & { visible: boolean };
const INTRODUCTION_DURATION = 8000;

export function ScreenMascot({ chat, label, spriteSheetUrl, visible }: ScreenMascotProps) {
  const shouldIntroduceRef = useRef(false);
  const horizontalAnimationRef = useRef<ReturnType<typeof animate> | null>(null);
  const verticalAnimationRef = useRef<ReturnType<typeof animate> | null>(null);
  const grabOffsetRef = useRef<Position>({ x: 48, y: 52 });
  const x = useMotionValue(HOME_X);
  const y = useMotionValue(20);
  const [position, setPosition] = useState<Position>({ x: HOME_X, y: 20 });
  const [mode, setMode] = useState<MascotMode>("idle");
  const [behavior, setBehavior] = useState<MascotBehavior>(readStoredBehavior);
  const [ready, setReady] = useState(false);
  const [showIntroduction, setShowIntroduction] = useState(false);
  const [statusPlacement, setStatusPlacement] = useState<MascotStatusPlacement>("above");
  const [statusDismissed, setStatusDismissed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [mascotConversation, setMascotConversation] = useState<MascotChatConversation | null>(null);
  const [voiceReaction, setVoiceReaction] = useState<HoneyConversationState>("inactive");
  const [conversationState, setConversationState] = useState<HoneyConversationState>("inactive");
  const voice = useMascotVoice((transcript) => { void sendVoiceMessage(transcript); });
  const documentationMode = window.location.pathname.startsWith("/app/devkit/docs");
  const activeConversationState = voiceReaction !== "inactive" ? voiceReaction : conversationState;
  const conversationMessage = getConversationMessage(activeConversationState);
  const effectiveBehavior = documentationMode || activeConversationState !== "inactive" ? "stay" : behavior;

  useEffect(() => {
    if (!visible) return;
    const stored = readStoredPosition();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    shouldIntroduceRef.current = !window.sessionStorage.getItem(mascotStorage.introduction);
    const initial = clampPosition(stored ?? { x: reducedMotion ? HOME_X : rightEdge(), y: bottomEdge() });
    x.set(initial.x);
    y.set(initial.y);
    setPosition(initial);
    setMode("idle");
    setReady(true);
    if (!stored && !reducedMotion) {
      window.requestAnimationFrame(() => startWalk({ ...initial, x: HOME_X }));
    }
  }, [visible, x, y]);
  useEffect(() => {
    if (!visible || !ready) return;
    const placeMascot = () => {
      const next = documentationMode ? documentationAnchorPosition() : readStoredPosition();
      if (!next) return;
      stopActiveMotion(horizontalAnimationRef, verticalAnimationRef);
      const position = clampPosition(next);
      x.set(position.x);
      y.set(position.y);
      setPosition(position);
      setMode("idle");
    };
    const frame = window.requestAnimationFrame(placeMascot);
    window.addEventListener("devkit:honey-documentation-anchor-ready", placeMascot);
    window.addEventListener("resize", placeMascot);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("devkit:honey-documentation-anchor-ready", placeMascot);
      window.removeEventListener("resize", placeMascot);
    };
  }, [documentationMode, ready, visible, x, y]);
  useIntroduction(visible, ready, mode, shouldIntroduceRef, setShowIntroduction);
  useNaturalRoaming(visible, ready, mode, effectiveBehavior, position, startWalk);
  useEffect(() => {
    function handleConversation(event: Event) {
      const nextState = (event as CustomEvent<HoneyConversationState>).detail;
      setConversationState(nextState);
      if (nextState === "inactive") return;
      stopActiveMotion(horizontalAnimationRef, verticalAnimationRef);
      setMode("idle");
      if (nextState !== "idle") setStatusDismissed(false);
    }
    window.addEventListener(honeyConversationEvent, handleConversation);
    handleConversation(new CustomEvent<HoneyConversationState>(honeyConversationEvent, { detail: getHoneyConversationState() }));
    return () => window.removeEventListener(honeyConversationEvent, handleConversation);
  }, []);
  useEffect(() => {
    if (!showIntroduction && !voice.listening && !voice.message && !conversationMessage) return;
    setStatusDismissed(false);
    setStatusPlacement(randomStatusPlacement(position));
  }, [conversationMessage, position, showIntroduction, voice.listening, voice.message]);

  if (!visible || !ready) return null;

  async function sendVoiceMessage(transcript: string) {
    if (!chat) return;
    voice.clear();
    setVoiceReaction("thinking");
    setStatusDismissed(false);
    try {
      const conversation = await chat.send(transcript, mascotConversation?.id ?? null);
      setMascotConversation(conversation);
      setVoiceReaction("success");
      openQuickChat();
      window.setTimeout(() => setVoiceReaction("inactive"), 2500);
    } catch {
      setVoiceReaction("error");
    }
  }

  function startWalk(target: Position) {
    const next = clampPosition(target);
    const current = { x: x.get(), y: y.get() };
    const duration = travelDuration(current, next);
    stopActiveMotion(horizontalAnimationRef, verticalAnimationRef);
    setMode(walkingMode(current, next));
    setPosition(next);
    horizontalAnimationRef.current = animate(x, next.x, {
      duration,
      ease: "linear",
      onComplete: () => finishWalk(next, setMode)
    });
    verticalAnimationRef.current = animate(y, next.y, { duration, ease: "linear" });
  }

  return (
    <motion.div
      aria-label={`${label} screen pet. Drag to reposition, or use the arrow keys.`}
      className={`group fixed left-0 top-0 cursor-grab touch-none select-none active:cursor-grabbing focus-visible:rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 ${documentationMode ? "z-[60]" : "z-40"}`}
      data-mascot-mode={mode}
      data-mascot-behavior={effectiveBehavior}
      data-mascot-conversation-state={conversationState}
      data-testid="screen-mascot"
      initial={false}
      onKeyDown={(event) => handleKeyMove(event, position, setPosition)}
      onPointerDown={(event) => startPointerDrag(event, x, y, grabOffsetRef, horizontalAnimationRef, verticalAnimationRef, setMode)}
      onPointerMove={(event) => moveWithPointer(event, x, y, grabOffsetRef)}
      onPointerUp={(event) => finishPointerDrag(event, x, y, setPosition, setMode)}
      role="img"
      style={{ x, y }}
      tabIndex={0}
      title={`Hi, I'm ${label}. I'm waiting to help you. Drag me anywhere on the screen.`}
    >
      {chatOpen && chat ? <MascotChat chat={chat} initialConversation={mascotConversation} onClose={() => setChatOpen(false)} onConversationChange={setMascotConversation} /> : null}
      {!chatOpen ? <MascotStatus
          dismissed={statusDismissed}
          label={label}
          listening={voice.listening || activeConversationState === "listening"}
          message={voice.listening && voice.message ? voice.message : conversationMessage || voice.message}
          onDismiss={() => {
            setShowIntroduction(false);
            setStatusDismissed(true);
            voice.clear();
          }}
          placement={statusPlacement}
          visible={showIntroduction || voice.listening || Boolean(voice.message) || Boolean(conversationMessage)}
        /> : null}
      <MascotSprite mode={mode} spriteSheetUrl={spriteSheetUrl} />
      <MascotControls
        behavior={behavior}
        {...(chat ? { chatHref: chat.href, onChatOpen: openQuickChat } : {})}
        onBehaviorChange={(nextBehavior) => {
          setBehavior(nextBehavior);
          window.localStorage.setItem(mascotStorage.behavior, nextBehavior);
          if (nextBehavior === "stay") setMode("idle");
        }}
      />
      <button
        aria-label={voice.listening ? "Stop Honey voice input" : "Start Honey voice input"}
        className={`absolute left-1/2 top-[calc(100%-0.25rem)] flex size-8 -translate-x-1/2 items-center justify-center rounded-full border border-amber-200/70 bg-[#fffaf0]/95 text-amber-700 shadow-md transition duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-200/15 dark:bg-[#272219]/95 dark:text-amber-200 ${voice.listening ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 group-focus-visible:pointer-events-auto group-focus-visible:scale-100 group-focus-visible:opacity-100"}`}
        disabled={!voice.supported && !voice.message}
        onClick={(event) => {
          event.stopPropagation();
          setStatusDismissed(false);
          voice.toggle();
        }}
        onPointerDown={(event) => event.stopPropagation()}
        title={voice.supported ? "Speak to Honey" : "Voice input is not supported in this browser"}
        type="button"
      >
        <AudioWaveformIcon className={`size-4 ${voice.listening ? "animate-pulse" : ""}`} />
      </button>
    </motion.div>
  );

  function openQuickChat() {
    setShowIntroduction(false);
    setStatusDismissed(true);
    setChatOpen(true);
  }
}

function useIntroduction(
  visible: boolean,
  ready: boolean,
  mode: MascotMode,
  shouldIntroduceRef: React.MutableRefObject<boolean>,
  setVisible: (visible: boolean) => void
) {
  useEffect(() => {
    if (!visible || !ready || mode !== "idle" || !shouldIntroduceRef.current) return;
    shouldIntroduceRef.current = false;
    window.sessionStorage.setItem(mascotStorage.introduction, "true");
    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), INTRODUCTION_DURATION);
    return () => window.clearTimeout(timeout);
  }, [mode, ready, setVisible, shouldIntroduceRef, visible]);
}

function useNaturalRoaming(
  visible: boolean,
  ready: boolean,
  mode: MascotMode,
  behavior: MascotBehavior,
  position: Position,
  startWalk: (target: Position) => void
) {
  useEffect(() => {
    if (!visible || !ready || mode !== "idle" || behavior !== "roam" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timeout = window.setTimeout(() => startWalk(nextRoamingPosition(position)), 6500 + Math.random() * 4500);
    return () => window.clearTimeout(timeout);
  }, [behavior, mode, position, ready, startWalk, visible]);
}

function finishWalk(position: Position, setMode: (mode: MascotMode) => void) {
  savePosition(position);
  setMode("idle");
}

function startPointerDrag(
  event: PointerEvent<HTMLDivElement>,
  x: ReturnType<typeof useMotionValue<number>>,
  y: ReturnType<typeof useMotionValue<number>>,
  grabOffsetRef: MutableRefObject<Position>,
  horizontal: React.MutableRefObject<ReturnType<typeof animate> | null>,
  vertical: React.MutableRefObject<ReturnType<typeof animate> | null>,
  setMode: (mode: MascotMode) => void
) {
  if ((event.target as HTMLElement).closest("button, [role='menuitem']")) return;
  event.currentTarget.setPointerCapture(event.pointerId);
  stopActiveMotion(horizontal, vertical);
  grabOffsetRef.current = { x: event.clientX - x.get(), y: event.clientY - y.get() };
  setMode("dragging");
}

function moveWithPointer(
  event: PointerEvent<HTMLDivElement>,
  x: ReturnType<typeof useMotionValue<number>>,
  y: ReturnType<typeof useMotionValue<number>>,
  grabOffsetRef: MutableRefObject<Position>
) {
  if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
  const next = clampPosition({
    x: event.clientX - grabOffsetRef.current.x,
    y: event.clientY - grabOffsetRef.current.y
  });
  x.set(next.x);
  y.set(next.y);
}

function finishPointerDrag(
  event: PointerEvent<HTMLDivElement>,
  x: ReturnType<typeof useMotionValue<number>>,
  y: ReturnType<typeof useMotionValue<number>>,
  setPosition: (position: Position) => void,
  setMode: (mode: MascotMode) => void
) {
  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
  const next = clampPosition({ x: x.get(), y: y.get() });
  x.set(next.x);
  y.set(next.y);
  setPosition(next);
  savePosition(next);
  setMode("idle");
}

function stopActiveMotion(
  horizontal: React.MutableRefObject<ReturnType<typeof animate> | null>,
  vertical: React.MutableRefObject<ReturnType<typeof animate> | null>
) {
  horizontal.current?.stop();
  vertical.current?.stop();
}

function handleKeyMove(event: KeyboardEvent<HTMLDivElement>, position: Position, setPosition: (position: Position) => void) {
  const movement: Record<string, Position> = { ArrowDown: { x: 0, y: 12 }, ArrowLeft: { x: -12, y: 0 }, ArrowRight: { x: 12, y: 0 }, ArrowUp: { x: 0, y: -12 } };
  const delta = movement[event.key];
  if (!delta) return;
  event.preventDefault();
  const next = clampPosition({ x: position.x + delta.x, y: position.y + delta.y });
  setPosition(next);
  savePosition(next);
}

function readStoredPosition(): Position | null {
  try {
    const value = window.localStorage.getItem(mascotStorage.position);
    return value ? (JSON.parse(value) as Position) : null;
  } catch {
    return null;
  }
}

function savePosition(position: Position) {
  window.localStorage.setItem(mascotStorage.position, JSON.stringify(position));
}

function readStoredBehavior(): MascotBehavior {
  if (typeof window === "undefined") return "roam";
  return window.localStorage.getItem(mascotStorage.behavior) === "stay" ? "stay" : "roam";
}

function randomStatusPlacement(position: Position): MascotStatusPlacement {
  const placements: MascotStatusPlacement[] = [];
  if (position.y > 100) placements.push("above");
  if (position.x > 250) placements.push("left");
  if (position.x < window.innerWidth - 350) placements.push("right");
  return placements[Math.floor(Math.random() * placements.length)] ?? "above";
}

function documentationAnchorPosition(): Position | null {
  const anchor = document.querySelector<HTMLElement>("[data-honey-documentation-anchor]");
  if (!anchor) return null;
  const bounds = anchor.getBoundingClientRect();
  return {
    x: bounds.left + Math.max(0, (bounds.width - 96) / 2),
    y: bounds.top + Math.max(0, (bounds.height - 104) / 2)
  };
}

function getConversationMessage(state: HoneyConversationState) {
  const messages: Partial<Record<HoneyConversationState, string>> = {
    error: "I hit a problem. You can retry.",
    listening: "I'm listening...",
    success: "Your answer is ready.",
    thinking: "Let me think about that.",
    warning: "This needs your attention."
  };
  return messages[state] ?? "";
}
