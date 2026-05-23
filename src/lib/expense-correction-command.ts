import type { ReviewStatus } from "./types";

export type ExpenseCorrectionField = "fecha" | "monto" | "proveedor" | "categoria";

export interface ExpenseCorrectionCommand {
  expenseId: number;
  field: ExpenseCorrectionField;
  value: string;
}

type ExpenseCorrectionUpdate =
  | {
      ok: true;
      updates: {
        expense_date?: string;
        total_amount?: number;
        supplier_name?: string;
        category_id?: string;
        review_status: ReviewStatus;
      };
      label: string;
      displayValue: string;
      categoryName?: string;
    }
  | { ok: false; error: string };

export function parseExpenseCorrectionCommand(
  text: string
): ExpenseCorrectionCommand | null {
  const match = text
    .trim()
    .match(/^corregir\s+gasto\s+(\d+)\s+(fecha|monto|proveedor|categoria)\s+(.+)$/i);

  if (!match) {
    return null;
  }

  return {
    expenseId: Number(match[1]),
    field: match[2].toLowerCase() as ExpenseCorrectionField,
    value: match[3].trim(),
  };
}

function parseArgentineDate(value: string) {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseArgentineAmount(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount;
}

export function buildExpenseCorrectionUpdate(
  command: ExpenseCorrectionCommand,
  categoryId?: string | null
): ExpenseCorrectionUpdate {
  if (command.field === "fecha") {
    const date = parseArgentineDate(command.value);
    if (!date) return { ok: false, error: "Fecha inválida. Usá formato DD/MM/AAAA." };

    return {
      ok: true,
      updates: { expense_date: date, review_status: "corrected" },
      label: "fecha",
      displayValue: command.value,
    };
  }

  if (command.field === "monto") {
    const amount = parseArgentineAmount(command.value);
    if (!amount) return { ok: false, error: "Monto inválido." };

    return {
      ok: true,
      updates: { total_amount: amount, review_status: "corrected" },
      label: "monto",
      displayValue: amount.toLocaleString("es-AR"),
    };
  }

  if (command.field === "proveedor") {
    return {
      ok: true,
      updates: { supplier_name: command.value, review_status: "corrected" },
      label: "proveedor",
      displayValue: command.value,
    };
  }

  if (!categoryId) {
    return { ok: false, error: `No encontré una categoría que coincida con "${command.value}".` };
  }

  return {
    ok: true,
    updates: { category_id: categoryId, review_status: "corrected" },
    label: "categoría",
    displayValue: command.value,
    categoryName: command.value,
  };
}
