import type { ReviewStatus } from "@/lib/types";

const ALLOWED_EXPENSE_UPDATE_FIELDS = [
  "expense_date",
  "supplier_name",
  "supplier_tax_id",
  "receipt_type",
  "receipt_number",
  "description",
  "total_amount",
  "currency",
  "payment_method",
  "category_id",
  "review_status",
  "notes",
  "created_by_profile_id",
] as const;

const STATUS_FIELD = "review_status";

export function buildExpenseUpdates(
  body: Record<string, unknown>,
  currentReviewStatus: ReviewStatus
) {
  const updates: Record<string, unknown> = {};

  for (const field of ALLOWED_EXPENSE_UPDATE_FIELDS) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("No valid fields to update");
  }

  const changedNonStatusFields = Object.keys(updates).some(
    (field) => field !== STATUS_FIELD
  );

  if (
    changedNonStatusFields &&
    updates.review_status === undefined &&
    currentReviewStatus !== "corrected"
  ) {
    updates.review_status = "corrected";
  }

  return updates;
}

export function parsePositiveIntegerParam(
  value: string | null,
  fallback: number,
  max = Number.MAX_SAFE_INTEGER
) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}
