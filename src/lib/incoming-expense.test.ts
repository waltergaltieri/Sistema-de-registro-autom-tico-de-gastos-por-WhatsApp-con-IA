import { describe, expect, it } from "vitest";
import {
  buildStorageUploadFailureReply,
  getOrganizationFileHashFilters,
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
