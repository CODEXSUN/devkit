import { apiGet, apiPost } from "../../shared/api/devkit-api";
import type { TelegramConnectionLink, TelegramMessage, TelegramStatus } from "./telegram-support.types";
export const telegramStatus = () => apiGet<TelegramStatus>("/telegram/status");
export const beginTelegramConnection = () => apiPost<TelegramConnectionLink>("/telegram/connect");
export const disconnectTelegram = () => apiPost<{ disconnected: boolean }>("/telegram/disconnect");
export const telegramMessages = () => apiGet<TelegramMessage[]>("/telegram/messages");
export const sendTelegramMessage = (body: string) => apiPost<{ sent: boolean }>("/telegram/messages", { body });
