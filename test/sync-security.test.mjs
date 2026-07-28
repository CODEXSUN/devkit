import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decryptSyncToken,
  encryptSyncToken,
  generateSyncToken,
  snapshotChecksum,
  syncTokenHash,
} from "../src/api/src/modules/sync/sync.crypto.ts";

test("sync tokens are 16 safe characters and stored encrypted", () => {
  process.env.DEVKIT_SYNC_TOKEN_PEPPER = "p".repeat(32);
  process.env.DEVKIT_SYNC_ENCRYPTION_KEY = "e".repeat(32);
  const token = generateSyncToken();
  assert.match(token, /^[A-Za-z0-9]{16}$/u);
  const encrypted = encryptSyncToken(token);
  assert.notEqual(encrypted, token);
  assert.equal(decryptSyncToken(encrypted), token);
  assert.match(syncTokenHash(token), /^[a-f0-9]{64}$/u);
});

test("snapshot checksums detect payload changes", () => {
  assert.notEqual(snapshotChecksum('{"revision":1}'), snapshotChecksum('{"revision":2}'));
});

