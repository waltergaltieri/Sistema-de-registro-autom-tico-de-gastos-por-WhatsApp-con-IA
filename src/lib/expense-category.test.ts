import { describe, expect, it } from "vitest";
import { resolveExpenseCategoryId } from "./expense-category";

describe("resolveExpenseCategoryId", () => {
  const categories = [
    { id: "materials", name: "Materiales" },
    { id: "other", name: "Otros" },
  ];

  it("matches the category suggested by the AI", () => {
    expect(resolveExpenseCategoryId(categories, "materiales")).toBe("materials");
  });

  it("falls back to Otros when the AI does not suggest a known category", () => {
    expect(resolveExpenseCategoryId(categories, null)).toBe("other");
    expect(resolveExpenseCategoryId(categories, "Transferencias")).toBe("other");
  });

  it("returns null only when no Otros category exists", () => {
    expect(resolveExpenseCategoryId([{ id: "materials", name: "Materiales" }], null)).toBeNull();
  });
});
