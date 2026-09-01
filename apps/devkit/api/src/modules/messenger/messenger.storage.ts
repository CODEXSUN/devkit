import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve } from "node:path";
import { AppError } from "@codexsun/framework/errors";

export const messengerAttachmentLimitBytes = 2 * 1024 * 1024;

export class MessengerAttachmentStorage {
  constructor(private readonly root = resolve(process.env.DEVKIT_STORAGE_PATH ?? process.cwd())) {}

  async write(storageKey: string, data: Buffer) {
    const path = this.resolveKey(storageKey);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data, { flag: "wx" });
  }

  read(storageKey: string) {
    return readFile(this.resolveKey(storageKey));
  }

  remove(storageKey: string) {
    return rm(this.resolveKey(storageKey), { force: true });
  }

  private resolveKey(storageKey: string) {
    const path = resolve(this.root, `messenger-attachments/${storageKey}`);
    const child = relative(this.root, path);
    if (!child || child.startsWith("..")) throw AppError.validation("Attachment storage reference is invalid.");
    return path;
  }
}

export function validateMessengerAttachment(data: Buffer, mimeType: string, name: string) {
  if (!data.length) throw AppError.validation("Attachment file is empty.");
  if (data.byteLength > messengerAttachmentLimitBytes) throw AppError.validation("Each attachment must be 2 MB or smaller.");
  const cleanName = basename(name.trim()).replace(/[<>:"/\\|?*]/gu, "-").slice(0, 240);
  if (!cleanName) throw AppError.validation("Attachment filename is required.");
  const allowed = mimeType.startsWith("image/") || ["application/pdf", "text/plain"].includes(mimeType);
  if (!allowed) throw AppError.validation("Messenger supports images, PDF, and text attachments.");
  return { checksum: createHash("sha256").update(data).digest("hex"), mimeType, originalName: cleanName };
}
