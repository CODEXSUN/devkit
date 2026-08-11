export type TelegramStatus = { botUsername: string; configured: boolean; connected: boolean; displayName: string; telegramUsername: string };
export type TelegramMessage = { body: string; createdAt: string; direction: "inbound" | "outbound"; id: string };
export type TelegramConnectionLink = { deepLink: string; expiresInMinutes: number };
