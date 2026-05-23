import { describe, expect, it } from "vitest";
import {
  parseExpenseCorrectionCommands,
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

describe("parseExpenseCorrectionCommands", () => {
  const today = new Date("2026-05-23T12:00:00.000Z");

  it("parses natural category and today date corrections without an explicit expense id", () => {
    expect(
      parseExpenseCorrectionCommands(
        "En categoria ponele Equipamiento y fecha la de hoy",
        today
      )
    ).toEqual([
      { field: "categoria", value: "Equipamiento" },
      { field: "fecha", value: "23/05/2026" },
    ]);
  });

  it("keeps an explicit expense id when present and parses multiple fields", () => {
    expect(
      parseExpenseCorrectionCommands(
        "corregir gasto 5 categoria Equipamiento y fecha la de hoy",
        today
      )
    ).toEqual([
      { expenseId: 5, field: "categoria", value: "Equipamiento" },
      { expenseId: 5, field: "fecha", value: "23/05/2026" },
    ]);
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
