import type { GeminiExpenseResponse } from "./types";

type ImportantField = "expense_date" | "supplier_name" | "total_amount" | "suggested_category_name";

const FIELD_LABELS: Record<ImportantField, string> = {
  expense_date: "Fecha del gasto",
  supplier_name: "Proveedor",
  total_amount: "Monto",
  suggested_category_name: "Categoría",
};

const FIELD_COMMANDS: Record<ImportantField, string> = {
  expense_date: "fecha 23/05/2026",
  supplier_name: "proveedor Nombre del proveedor",
  total_amount: "monto 8000",
  suggested_category_name: "categoria Materiales",
};

const FIELD_ALIASES: Record<string, ImportantField> = {
  fecha: "expense_date",
  date: "expense_date",
  expense_date: "expense_date",
  proveedor: "supplier_name",
  supplier: "supplier_name",
  supplier_name: "supplier_name",
  monto: "total_amount",
  total: "total_amount",
  total_amount: "total_amount",
  categoria: "suggested_category_name",
  category: "suggested_category_name",
  suggested_category_name: "suggested_category_name",
};

function normalizeDoubtfulField(field: string): ImportantField | null {
  const normalized = field
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

  return FIELD_ALIASES[normalized] || null;
}

export function buildMissingFieldsPrompt(expenseId: number, aiResult: GeminiExpenseResponse) {
  const missing = new Set<ImportantField>();

  if (!aiResult.expense_date) missing.add("expense_date");
  if (!aiResult.supplier_name) missing.add("supplier_name");
  if (!aiResult.total_amount) missing.add("total_amount");
  if (!aiResult.suggested_category_name) missing.add("suggested_category_name");

  for (const doubtful of aiResult.doubtful_fields || []) {
    const field = normalizeDoubtfulField(doubtful.field);
    if (field) missing.add(field);
  }

  if (missing.size === 0) {
    return "";
  }

  const fields = Array.from(missing);
  const labels = fields.map((field) => `- ${FIELD_LABELS[field]}`).join("\n");
  const examples = fields
    .slice(0, 2)
    .map((field) => `corregir gasto ${expenseId} ${FIELD_COMMANDS[field]}`)
    .join("\n");

  return [
    "",
    "Me faltó confirmar:",
    labels,
    "",
    "Si querés completarlo, respondé:",
    examples,
  ].join("\n");
}
