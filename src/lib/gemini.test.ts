import { describe, expect, it } from "vitest";
import { estimateGeminiCost, getResponseSchema, normalizeGeminiResponse } from "./gemini";
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

describe("estimateGeminiCost", () => {
  it("uses Gemini 2.5 Flash-Lite standard pricing for receipt image analysis", () => {
    const cost = estimateGeminiCost("gemini-2.5-flash-lite", {
      promptTokenCount: 10_000,
      candidatesTokenCount: 500,
      totalTokenCount: 10_500,
    });

    expect(cost).toMatchObject({
      inputTokens: 10_000,
      outputTokens: 500,
      totalTokens: 10_500,
      inputCostPer1MUsd: 0.1,
      outputCostPer1MUsd: 0.4,
    });
    expect(cost.estimatedCostUsd).toBeCloseTo(0.0012, 8);
  });

  it("falls back to input plus output tokens when total tokens are missing", () => {
    const cost = estimateGeminiCost("gemini-2.5-flash-lite", {
      promptTokenCount: 100,
      candidatesTokenCount: 25,
    });

    expect(cost.totalTokens).toBe(125);
  });
});
