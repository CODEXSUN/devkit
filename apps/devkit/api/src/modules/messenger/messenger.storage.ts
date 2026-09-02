import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve } from "node:path";
import { AppError } from "@codexsun/framework/errors";

export const messengerAttachmentLimitBytes = 2 * 1024 * 1024;
const rasterImageTypes = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

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
  const allowed = rasterImageTypes.has(mimeType) || ["application/pdf", "text/plain"].includes(mimeType);
  if (!allowed) throw AppError.validation("Messenger supports images, PDF, and text attachments.");
  if (!contentMatchesType(data, mimeType)) {
    throw AppError.validation("Attachment content does not match its file type.");
  }
  return { checksum: createHash("sha256").update(data).digest("hex"), mimeType, originalName: cleanName };
}

function contentMatchesType(data: Buffer, mimeType: string) {
  if (mimeType === "image/png") return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/jpeg") return data[0] === 0xff && data[1] === 0xd8 && data.at(-2) === 0xff && data.at(-1) === 0xd9;
  if (mimeType === "image/gif") return ["GIF87a", "GIF89a"].includes(data.subarray(0, 6).toString("ascii"));
  if (mimeType === "image/webp") return data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP";
  if (mimeType === "image/avif") return data.subarray(4, 12).toString("ascii").includes("ftypavif");
  if (mimeType === "application/pdf") return data.subarray(0, 5).toString("ascii") === "%PDF-";
  return !data.includes(0);
}
