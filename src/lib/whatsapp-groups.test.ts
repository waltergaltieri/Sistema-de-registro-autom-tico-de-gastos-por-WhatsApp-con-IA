import { describe, expect, it } from "vitest";
import { shouldAutoLinkSyncedWhatsAppGroup } from "./whatsapp-groups";

describe("shouldAutoLinkSyncedWhatsAppGroup", () => {
  it("does not link a synced group automatically", () => {
    expect(
      shouldAutoLinkSyncedWhatsAppGroup({
        currentLinkedGroupId: null,
        syncedGroupCount: 1,
      })
    ).toBe(false);
  });
});
