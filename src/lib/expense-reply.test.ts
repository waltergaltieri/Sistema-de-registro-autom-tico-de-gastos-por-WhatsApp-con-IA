import { describe, expect, it } from "vitest";
import { buildMissingFieldsPrompt } from "./expense-reply";
import type { GeminiExpenseResponse } from "./types";

const baseAiResult: GeminiExpenseResponse = {
  expense_date: "2026-05-23",
  supplier_name: "Mono Ferretero",
  supplier_tax_id: null,
  receipt_type: "presupuesto",
  receipt_number: null,
  description: "Compra de materiales",
  total_amount: 8000,
  currency: "ARS",
  payment_method: null,
  suggested_category_name: "Materiales",
  items: [],
  confidence: 0.86,
  doubtful_fields: [],
  short_human_summary: "Materiales por $8.000",
};

describe("buildMissingFieldsPrompt", () => {
  it("returns an empty string when important fields are present and not doubtful", () => {
    expect(buildMissingFieldsPrompt(2, baseAiResult)).toBe("");
  });

  it("asks for a missing date with a copyable correction command", () => {
    const prompt = buildMissingFieldsPrompt(2, {
      ...baseAiResult,
      expense_date: null,
      doubtful_fields: [{ field: "expense_date", reason: "No visible" }],
    });

    expect(prompt).toContain("Me faltó confirmar");
    expect(prompt).toContain("Fecha del gasto");
    expect(prompt).toContain("corregir gasto 2 fecha 23/05/2026");
  });

  it("deduplicates missing and doubtful field names", () => {
    const prompt = buildMissingFieldsPrompt(3, {
      ...baseAiResult,
      total_amount: null,
      doubtful_fields: [
        { field: "total_amount", reason: "No claro" },
        { field: "monto", reason: "No claro" },
      ],
    });

    expect(prompt.match(/Monto/g)).toHaveLength(1);
  });
});
