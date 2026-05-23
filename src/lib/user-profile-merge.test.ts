import { describe, expect, it } from "vitest";
import { canMergeDuplicatePhoneProfile } from "./user-profile-merge";

describe("canMergeDuplicatePhoneProfile", () => {
  it("allows merging an automatic WhatsApp-only profile", () => {
    expect(
      canMergeDuplicatePhoneProfile({
        authUserId: null,
        role: "partner",
      })
    ).toBe(true);
  });

  it("does not merge a profile that already has system access", () => {
    expect(
      canMergeDuplicatePhoneProfile({
        authUserId: "auth-user-id",
        role: "partner",
      })
    ).toBe(false);
  });

  it("does not merge another admin profile", () => {
    expect(
      canMergeDuplicatePhoneProfile({
        authUserId: null,
        role: "admin",
      })
    ).toBe(false);
  });
});
