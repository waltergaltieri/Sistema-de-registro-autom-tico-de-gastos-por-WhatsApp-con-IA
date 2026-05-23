import { describe, expect, it } from "vitest";
import {
  buildExpenseUpdates,
  parsePositiveIntegerParam,
} from "./expenses";

describe("buildExpenseUpdates", () => {
  it("marks an expense as corrected when editable fields change without an explicit status", () => {
    expect(
      buildExpenseUpdates(
        {
          total_amount: 12345,
          supplier_name: "Ferreteria Norte",
          ignored_field: "not allowed",
        },
        "pending"
      )
    ).toEqual({
      total_amount: 12345,
      supplier_name: "Ferreteria Norte",
      review_status: "corrected",
    });
  });

  it("respects an explicit review status", () => {
    expect(
      buildExpenseUpdates(
        {
          total_amount: 12345,
          review_status: "reviewed",
        },
        "pending"
      )
    ).toEqual({
      total_amount: 12345,
      review_status: "reviewed",
    });
  });

  it("throws when the body does not contain valid update fields", () => {
    expect(() => buildExpenseUpdates({ ignored_field: true }, "pending")).toThrow(
      "No valid fields to update"
    );
  });
});

describe("parsePositiveIntegerParam", () => {
  it("uses the fallback for invalid, zero, or negative values", () => {
    expect(parsePositiveIntegerParam("abc", 1)).toBe(1);
    expect(parsePositiveIntegerParam("0", 1)).toBe(1);
    expect(parsePositiveIntegerParam("-3", 1)).toBe(1);
  });

  it("caps values at the configured maximum", () => {
    expect(parsePositiveIntegerParam("500", 50, 100)).toBe(100);
  });
});
