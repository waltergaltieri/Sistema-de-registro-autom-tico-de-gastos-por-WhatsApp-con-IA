import { describe, expect, it } from "vitest";
import {
  buildExpenseCorrectionUpdate,
  parseExpenseCorrectionCommand,
} from "./expense-correction-command";

describe("parseExpenseCorrectionCommand", () => {
  it("parses a date correction", () => {
    expect(parseExpenseCorrectionCommand("corregir gasto 2 fecha 23/05/2026")).toEqual({
      expenseId: 2,
      field: "fecha",
      value: "23/05/2026",
    });
  });

  it("parses amount and supplier corrections", () => {
    expect(parseExpenseCorrectionCommand("corregir gasto 7 monto $8.000")).toEqual({
      expenseId: 7,
      field: "monto",
      value: "$8.000",
    });

    expect(parseExpenseCorrectionCommand("corregir gasto 7 proveedor Mono Ferretero")).toEqual({
      expenseId: 7,
      field: "proveedor",
      value: "Mono Ferretero",
    });
  });

  it("ignores unrelated messages", () => {
    expect(parseExpenseCorrectionCommand("hola")).toBeNull();
  });
});

describe("buildExpenseCorrectionUpdate", () => {
  it("normalizes an Argentine date", () => {
    expect(buildExpenseCorrectionUpdate({ expenseId: 2, field: "fecha", value: "23/05/2026" })).toEqual({
      ok: true,
      updates: { expense_date: "2026-05-23", review_status: "corrected" },
      label: "fecha",
      displayValue: "23/05/2026",
    });
  });

  it("normalizes Argentine amount formats", () => {
    expect(buildExpenseCorrectionUpdate({ expenseId: 2, field: "monto", value: "$8.000,50" })).toMatchObject({
      ok: true,
      updates: { total_amount: 8000.5, review_status: "corrected" },
    });
  });

  it("rejects invalid dates and amounts", () => {
    expect(buildExpenseCorrectionUpdate({ expenseId: 2, field: "fecha", value: "99/99/2026" })).toMatchObject({
      ok: false,
    });
    expect(buildExpenseCorrectionUpdate({ expenseId: 2, field: "monto", value: "abc" })).toMatchObject({
      ok: false,
    });
  });
});
