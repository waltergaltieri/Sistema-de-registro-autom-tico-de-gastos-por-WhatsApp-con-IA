interface ExpenseCategoryOption {
  id: string;
  name: string;
}

export function resolveExpenseCategoryId(
  categories: ExpenseCategoryOption[],
  suggestedCategoryName: string | null | undefined
) {
  const normalizedSuggestion = suggestedCategoryName?.trim().toLowerCase();

  if (normalizedSuggestion) {
    const suggestedMatch = categories.find(
      (category) => category.name.toLowerCase() === normalizedSuggestion
    );
    if (suggestedMatch) return suggestedMatch.id;
  }

  return (
    categories.find((category) => category.name.toLowerCase() === "otros")?.id ??
    null
  );
}
