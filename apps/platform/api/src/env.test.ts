import { describe, expect, it } from "vitest";
import { localDevelopmentRedisUrl } from "./env.js";

describe("localDevelopmentRedisUrl", () => {
  it("maps Docker Redis DNS to the published local port for development", () => {
    expect(localDevelopmentRedisUrl("redis://secret@cxapp-redis:6379", "development")).toBe(
      "redis://secret@127.0.0.1:6379"
    );
  });

  it("keeps Docker DNS in production", () => {
    expect(localDevelopmentRedisUrl("redis://secret@cxapp-redis:6379", "production")).toBe(
      "redis://secret@cxapp-redis:6379"
    );
  });
});
