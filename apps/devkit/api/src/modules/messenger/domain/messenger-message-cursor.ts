import { AppError } from "@codexsun/framework/errors";

export type MessengerMessageCursorValue = { createdAt: string; uuid: string };

export class MessengerMessageCursor {
  static encode(value: MessengerMessageCursorValue) {
    return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  }

  static decode(cursor: string): MessengerMessageCursorValue {
    try {
      const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<MessengerMessageCursorValue>;
      if (!value.createdAt || !value.uuid || Number.isNaN(Date.parse(value.createdAt))) throw new Error("Invalid cursor");
      return { createdAt: value.createdAt, uuid: value.uuid };
    } catch {
      throw AppError.validation("Messenger history cursor is invalid.");
    }
  }
}
