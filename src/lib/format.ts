// Shared formatting utilities

/**
 * Format a number as Argentine currency
 */
export function formatCurrency(amount: number | null, currency = "ARS"): string {
  if (amount === null || amount === undefined) return "—";
  const formatted = new Intl.NumberFormat("es-AR", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return currency === "USD" ? `US$${formatted}` : `$${formatted}`;
}

/**
 * Format a date string for display
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format a date string with time
 */
export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get a relative time string
 */
export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin}min`;
  if (diffHr < 24) return `Hace ${diffHr}h`;
  if (diffDay < 7) return `Hace ${diffDay}d`;
  return formatDate(dateStr);
}

/**
 * Get confidence level label and color
 */
export function getConfidenceInfo(confidence: number | null): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (confidence === null)
    return { label: "Sin datos", color: "text-muted-foreground", bgColor: "bg-muted" };
  if (confidence >= 0.8)
    return { label: "Alta", color: "text-success", bgColor: "bg-success/10" };
  if (confidence >= 0.5)
    return { label: "Media", color: "text-warning", bgColor: "bg-warning/10" };
  return { label: "Baja", color: "text-destructive", bgColor: "bg-destructive/10" };
}

/**
 * Get review status badge info
 */
export function getStatusInfo(status: string): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  dotColor: string;
} {
  switch (status) {
    case "reviewed":
      return { label: "Revisado", variant: "default", dotColor: "bg-success" };
    case "corrected":
      return { label: "Corregido", variant: "secondary", dotColor: "bg-chart-2" };
    case "rejected":
      return { label: "Rechazado", variant: "destructive", dotColor: "bg-destructive" };
    case "pending":
    default:
      return { label: "Pendiente", variant: "outline", dotColor: "bg-warning" };
  }
}
