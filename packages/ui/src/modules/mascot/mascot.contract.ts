export type ScreenCompanionConfig = {
  chat?: MascotChatConfig;
  label: string;
  spriteSheetUrl: string;
};

export type MascotChatMessage = { body: string; id: string; role: "assistant" | "user" };
export type MascotChatConversation = { id: string; messages: MascotChatMessage[] };
export type MascotChatConfig = {
  href: string;
  load: (threadId: string | null) => Promise<MascotChatConversation | null>;
  send: (message: string, threadId: string | null) => Promise<MascotChatConversation>;
};

export type Position = { x: number; y: number };
export type MascotMode = "walking-left" | "walking-right" | "idle" | "dragging";
export type MascotBehavior = "stay" | "roam";

export const mascotAtlas = {
  columns: 8,
  displayScale: 0.5,
  frameHeight: 208,
  frameWidth: 192,
  rows: {
    idle: { frameCount: 7, index: 0 },
    runningRight: { frameCount: 8, index: 1 },
    runningLeft: { frameCount: 8, index: 2 }
  },
  totalRows: 11
} as const;

export const mascotStorage = {
  behavior: "devkit.screen-companion.behavior",
  introduction: "devkit.screen-companion.honey-introduced",
  position: "devkit.screen-companion.position"
} as const;
