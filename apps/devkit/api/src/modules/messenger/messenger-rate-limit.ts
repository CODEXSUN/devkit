import { AppError } from "@codexsun/framework/errors";

export type MessengerWriteAction = "attachment" | "conversation" | "message" | "reaction";

const limits: Record<MessengerWriteAction, number> = {
  attachment: 20,
  conversation: 30,
  message: 60,
  reaction: 120
};

export class MessengerRateLimiter {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly windowMs = 60_000
  ) {}

  consume(actorId: string, action: MessengerWriteAction) {
    const key = `${actorId}:${action}`;
    const now = this.now();
    const current = this.windows.get(key);
    const window = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + this.windowMs }
      : current;
    window.count += 1;
    this.windows.set(key, window);
    if (window.count > limits[action]) {
      throw new AppError({
        code: "MESSENGER_RATE_LIMITED",
        details: { retryAfterMs: window.resetAt - now },
        message: "Too many Messenger requests. Try again shortly.",
        statusCode: 429
      });
    }
  }
}
