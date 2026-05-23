import { describe, expect, it } from "vitest";
import { getResponseSchema, normalizeGeminiResponse } from "./gemini";
import type { GeminiExpenseResponse } from "./types";

const baseResponse: GeminiExpenseResponse = {
  expense_date: null,
  supplier_name: null,
  supplier_tax_id: null,
  receipt_type: null,
  receipt_number: null,
  description: "Comprobante sin monto legible",
  total_amount: null,
  currency: null,
  payment_method: null,
  suggested_category_name: null,
  items: [],
  confidence: 0.6,
  doubtful_fields: [],
  short_human_summary: "Sin monto legible",
};

describe("normalizeGeminiResponse", () => {
  it("keeps an unknown amount as null instead of converting it to zero", () => {
    expect(normalizeGeminiResponse(baseResponse).total_amount).toBeNull();
  });

  it("normalizes negative amounts without changing unknown amounts", () => {
    expect(
      normalizeGeminiResponse({ ...baseResponse, total_amount: -1250 }).total_amount
    ).toBe(1250);
  });
});

describe("getResponseSchema", () => {
  it("allows Gemini to return null when the amount is not visible", () => {
    const schema = getResponseSchema();

    expect(schema.properties.total_amount).toMatchObject({
      type: "NUMBER",
      nullable: true,
    });
  });
});
