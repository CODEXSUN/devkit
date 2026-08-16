import { describe, expect, it } from "vitest";
import { conversationMarkerPosition } from "./conversation-rail";

describe("conversation rail", () => {
  it("maps message positions onto the full rail", () => {
    expect(conversationMarkerPosition(0, 800)).toBe(0);
    expect(conversationMarkerPosition(400, 800)).toBe(50);
    expect(conversationMarkerPosition(900, 800)).toBe(100);
  });

  it("keeps non-scrollable conversations at the rail start", () => {
    expect(conversationMarkerPosition(200, 0)).toBe(0);
  });
});
