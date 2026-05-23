import { describe, expect, it } from "vitest";
import {
  buildStaleMessageReply,
  buildStorageUploadFailureReply,
  getMaxIncomingMessageAgeHours,
  getOrganizationFileHashFilters,
  isIncomingMessageTooOld,
} from "./incoming-expense";

describe("getOrganizationFileHashFilters", () => {
  it("scopes duplicate file detection to the current organization", () => {
    expect(getOrganizationFileHashFilters("org-1", "hash-1")).toEqual([
      ["organization_id", "org-1"],
      ["file_sha256", "hash-1"],
    ]);
  });
});

describe("buildStorageUploadFailureReply", () => {
  it("returns an explicit failure instead of allowing the expense to continue", () => {
    expect(buildStorageUploadFailureReply()).toMatchObject({
      ok: false,
      error: "Storage upload failed",
    });
  });
});

describe("getMaxIncomingMessageAgeHours", () => {
  it("uses 24 hours by default", () => {
    expect(getMaxIncomingMessageAgeHours(undefined)).toBe(24);
    expect(getMaxIncomingMessageAgeHours("0")).toBe(24);
    expect(getMaxIncomingMessageAgeHours("invalid")).toBe(24);
  });

  it("accepts a positive numeric override", () => {
    expect(getMaxIncomingMessageAgeHours("72")).toBe(72);
  });
});

describe("isIncomingMessageTooOld", () => {
  const now = new Date("2026-05-23T18:00:00.000Z");

  it("allows fresh messages", () => {
    expect(
      isIncomingMessageTooOld("2026-05-23T17:30:00.000Z", now, 24)
    ).toBe(false);
  });

  it("blocks messages older than the allowed window", () => {
    expect(
      isIncomingMessageTooOld("2026-05-22T17:59:59.000Z", now, 24)
    ).toBe(true);
  });

  it("does not block missing or invalid timestamps", () => {
    expect(isIncomingMessageTooOld(undefined, now, 24)).toBe(false);
    expect(isIncomingMessageTooOld("not-a-date", now, 24)).toBe(false);
  });
});

describe("buildStaleMessageReply", () => {
  it("returns a non-processing reply for stale media", () => {
    expect(buildStaleMessageReply(24)).toMatchObject({
      ok: false,
      error: "Message too old",
    });
  });
});
