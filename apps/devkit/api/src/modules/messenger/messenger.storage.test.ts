import assert from "node:assert/strict";
import test from "node:test";
import { validateMessengerAttachment } from "./messenger.storage.js";

test("attachment validation accepts matching raster image content", () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);
  assert.equal(validateMessengerAttachment(png, "image/png", "photo.png").mimeType, "image/png");
});

test("attachment validation rejects active image formats", () => {
  assert.throws(
    () => validateMessengerAttachment(Buffer.from("<svg/>"), "image/svg+xml", "image.svg"),
    /supports images/iu
  );
});

test("attachment validation rejects spoofed file content", () => {
  assert.throws(
    () => validateMessengerAttachment(Buffer.from("not a pdf"), "application/pdf", "invoice.pdf"),
    /does not match/iu
  );
});

test("attachment validation sanitizes the stored filename", () => {
  const result = validateMessengerAttachment(Buffer.from("safe text"), "text/plain", "../unsafe:name.txt");
  assert.equal(result.originalName, "unsafe-name.txt");
});
