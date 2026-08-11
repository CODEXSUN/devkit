import { randomBytes, timingSafeEqual } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import { TaskManagerService } from "../task-manager/task-manager.service.js";
import { TelegramSupportRepository } from "./telegram-support.repository.js";

const scopeKey = "super-admin";

export class TelegramSupportService {
  constructor(
    private readonly repository = new TelegramSupportRepository(),
    private readonly tasks = new TaskManagerService()
  ) {}

  async status() {
    const connection = await this.repository.connection();
    return {
      botUsername: botUsername(),
      configured: Boolean(botUsername() && process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_WEBHOOK_PUBLIC_URL?.trim() && process.env.TELEGRAM_WEBHOOK_SECRET?.trim()),
      connected: connection?.status === "connected",
      displayName: connection?.display_name ?? "",
      telegramUsername: connection?.telegram_username ?? ""
    };
  }

  async beginConnection() {
    if (!botUsername()) throw AppError.validation("TELEGRAM_BOT_USERNAME is not configured.");
    await configureWebhook();
    const token = randomBytes(18).toString("base64url");
    await this.repository.disconnect();
    await this.repository.createConnection(token);
    return { deepLink: `https://t.me/${botUsername()}?start=${token}`, expiresInMinutes: 15 };
  }

  async disconnect() { await this.repository.disconnect(); return { disconnected: true }; }

  async messages() {
    const connection = await this.connected();
    return this.repository.messages(connection.chat_id!);
  }

  async send(bodyInput: string) {
    const body = bodyInput.trim();
    if (!body) throw AppError.validation("Message is required.");
    const connection = await this.connected();
    const result = await telegram("sendMessage", { chat_id: connection.chat_id, text: body });
    await this.repository.addMessage(connection.chat_id!, "outbound", body, String(result.message_id ?? ""));
    return { sent: true };
  }

  async webhook(secret: string | undefined, update: TelegramUpdate) {
    verifySecret(secret);
    const message = update.message;
    if (!message?.text) return { accepted: true };
    const chatId = String(message.chat.id);
    await this.repository.addMessage(chatId, "inbound", message.text, String(message.message_id));
    const response = await this.command(message);
    if (response) {
      const sent = await telegram("sendMessage", { chat_id: chatId, text: response });
      await this.repository.addMessage(chatId, "outbound", response, String(sent.message_id ?? ""));
    }
    return { accepted: true };
  }

  private async command(message: NonNullable<TelegramUpdate["message"]>) {
    const [command, argument = ""] = message.text.trim().split(/\s+/u);
    if (command === "/start" && argument) {
      const connected = await this.repository.connect(argument, String(message.chat.id), message.from?.username ?? "", [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" "));
      return connected ? "Connected to CodeLogicX. You can now control tasks and receive notifications here." : "This connection link is invalid or already used.";
    }
    if (command === "/starttask" || command === "/stoptask") {
      const connection = await this.connected();
      if (connection.chat_id !== String(message.chat.id)) return "This Telegram account is not connected.";
      if (!argument) return `Usage: ${command} <task-id>`;
      const status = command === "/starttask" ? "in-progress" : "open";
      const task = await this.tasks.status(scopeKey, argument, status, "telegram-support");
      return `${command === "/starttask" ? "Started" : "Stopped"}: ${task.title} (${task.id})`;
    }
    if (command === "/tasks") {
      const tasks = (await this.tasks.list(scopeKey)).filter((task) => task.status !== "completed").slice(0, 10);
      return tasks.length ? tasks.map((task) => `${task.id} · ${task.status} · ${task.title}`).join("\n") : "No active tasks.";
    }
    if (command === "/help") return "Commands: /tasks, /starttask <id>, /stoptask <id>, /help";
    return null;
  }

  private async connected() {
    const connection = await this.repository.connection();
    if (!connection?.chat_id || connection.status !== "connected") throw AppError.validation("Connect Telegram first.");
    return connection;
  }
}

type TelegramUpdate = { message?: { chat: { id: number }; from?: { first_name?: string; last_name?: string; username?: string }; message_id: number; text: string } };

async function telegram(method: string, payload: unknown) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw AppError.validation("TELEGRAM_BOT_TOKEN is not configured.");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { body: JSON.stringify(payload), headers: { "Content-Type": "application/json" }, method: "POST" });
  const result = await response.json() as { ok: boolean; result?: Record<string, unknown>; description?: string };
  if (!response.ok || !result.ok) throw new Error(result.description ?? "Telegram request failed.");
  return result.result ?? {};
}

function botUsername() { return process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/u, "") ?? ""; }
async function configureWebhook() {
  const publicUrl = process.env.TELEGRAM_WEBHOOK_PUBLIC_URL?.trim().replace(/\/+$/u, "");
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!publicUrl || !secret) throw AppError.validation("TELEGRAM_WEBHOOK_PUBLIC_URL and TELEGRAM_WEBHOOK_SECRET are required.");
  const url = publicUrl.endsWith("/telegram/webhook") ? publicUrl : `${publicUrl}/api/devkit/telegram/webhook`;
  await telegram("setWebhook", { allowed_updates: ["message"], secret_token: secret, url });
}
function verifySecret(value: string | undefined) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected || !value || expected.length !== value.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(value))) throw AppError.unauthorized("Invalid Telegram webhook secret.");
}
