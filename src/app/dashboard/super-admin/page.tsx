"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Bot,
  Database,
  DollarSign,
  HardDrive,
  Loader2,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

type MetricsResponse = {
  ok: true;
  generatedAt: string;
  monthStart: string;
  pricing: {
    monthlyPriceUsd: number;
    note: string;
  };
  bot: {
    status: string;
    updatedAt: string | null;
    monthlyMessages: number;
    monthlyFailures: number;
  };
  kpis: {
    organizations: number;
    monthlyRevenueUsd: number;
    monthlyAiCostUsd: number;
    estimatedAiMarginUsd: number;
    aiCalls: number;
    aiSuccessRate: number;
    inputTokens: number;
    outputTokens: number;
    avgCostPerAiCallUsd: number;
    avgLatencyMs: number;
    monthlyReceipts: number;
    pendingReview: number;
    storageFiles: number;
    storageBytes: number;
    botFailures: number;
  };
  organizations: Array<{
    id: string;
    name: string;
    monthlyRevenueUsd: number;
    monthlyAiCostUsd: number;
    estimatedAiMarginUsd: number;
    activeUsers: number;
    totalUsers: number;
    totalExpenses: number;
    monthlyExpenses: number;
    pendingReview: number;
    aiCalls: number;
    aiFailures: number;
    storageBytes: number;
    botFailures: number;
    whatsappGroup: string | null;
    whatsappMembers: number;
  }>;
  recentAiErrors: Array<{
    organizationId: string;
    expenseId: number | null;
    model: string;
    error: string | null;
    createdAt: string;
  }>;
  recentBotErrors: Array<{
    organizationId: string | null;
    messageType: string | null;
    error: string | null;
    createdAt: string;
  }>;
};

export default function SuperAdminPage() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMetrics() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/super-admin/metrics", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudieron cargar las metricas");
      }

      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMetrics();
  }, []);

  if (loading && !metrics) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando control de costos...</p>
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="max-w-md space-y-4 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
          <div>
            <h1 className="text-xl font-semibold">No se pudo abrir Super Admin</h1>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={loadMetrics}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const lastUpdated = new Date(metrics.generatedAt).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Super Admin</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Control de costos, uso del bot y salud operativa. Actualizado {lastUpdated}.
          </p>
        </div>
        <Button variant="outline" onClick={loadMetrics} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Actualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Ingreso mensual"
          value={formatUsd(metrics.kpis.monthlyRevenueUsd)}
          subtitle={`${metrics.kpis.organizations} org. x ${formatUsd(metrics.pricing.monthlyPriceUsd)}`}
          icon={DollarSign}
        />
        <MetricCard
          title="Costo IA mensual"
          value={formatUsd(metrics.kpis.monthlyAiCostUsd)}
          subtitle={`${metrics.kpis.aiCalls} llamadas - ${formatTokens(metrics.kpis.inputTokens + metrics.kpis.outputTokens)}`}
          icon={Sparkles}
        />
        <MetricCard
          title="Margen vs IA"
          value={formatUsd(metrics.kpis.estimatedAiMarginUsd)}
          subtitle={`Promedio ${formatUsd(metrics.kpis.avgCostPerAiCallUsd)} por analisis`}
          icon={Server}
        />
        <MetricCard
          title="Comprobantes"
          value={metrics.kpis.monthlyReceipts.toLocaleString("es-AR")}
          subtitle={`${metrics.kpis.pendingReview} pendientes de revision`}
          icon={Database}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Uso por organizacion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organizacion</TableHead>
                    <TableHead>Socios</TableHead>
                    <TableHead>Gastos mes</TableHead>
                    <TableHead>IA</TableHead>
                    <TableHead>Storage</TableHead>
                    <TableHead>Margen IA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div className="font-medium">{org.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {org.whatsappGroup || "Sin grupo"}{org.whatsappMembers ? ` - ${org.whatsappMembers} miembros` : ""}
                        </div>
                      </TableCell>
                      <TableCell>{org.activeUsers}/{org.totalUsers}</TableCell>
                      <TableCell>
                        <div>{org.monthlyExpenses}</div>
                        <div className="text-xs text-muted-foreground">{org.pendingReview} pendientes</div>
                      </TableCell>
                      <TableCell>
                        <div>{formatUsd(org.monthlyAiCostUsd)}</div>
                        <div className="text-xs text-muted-foreground">
                          {org.aiCalls} llamadas{org.aiFailures ? `, ${org.aiFailures} errores` : ""}
                        </div>
                      </TableCell>
                      <TableCell>{formatBytes(org.storageBytes)}</TableCell>
                      <TableCell className="font-semibold">{formatUsd(org.estimatedAiMarginUsd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <StatusPanel metrics={metrics} />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Supabase estimado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoLine label="Archivos guardados" value={metrics.kpis.storageFiles.toLocaleString("es-AR")} />
              <InfoLine label="Storage comprobantes" value={formatBytes(metrics.kpis.storageBytes)} />
              <InfoLine label="Mensajes bot mes" value={metrics.bot.monthlyMessages.toLocaleString("es-AR")} />
              <p className="text-xs text-muted-foreground">{metrics.pricing.note}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ErrorPanel title="Errores IA recientes" rows={metrics.recentAiErrors} />
        <ErrorPanel title="Errores bot recientes" rows={metrics.recentBotErrors} />
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof DollarSign;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusPanel({ metrics }: { metrics: MetricsResponse }) {
  const isOnline = metrics.bot.status === "conectado";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4" />
          Bot y servidor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">WhatsApp bot</span>
          <Badge variant={isOnline ? "default" : "destructive"}>{metrics.bot.status}</Badge>
        </div>
        <InfoLine label="Ultima senal" value={metrics.bot.updatedAt ? timeAgo(metrics.bot.updatedAt) : "Sin datos"} />
        <InfoLine label="Errores bot mes" value={metrics.bot.monthlyFailures.toLocaleString("es-AR")} />
        <InfoLine label="Latencia IA prom." value={`${Math.round(metrics.kpis.avgLatencyMs)} ms`} />
        <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
          <HardDrive className="h-4 w-4 shrink-0" />
          CPU/RAM/disco del servidor Oracle requiere un endpoint del servidor. La pantalla ya queda lista para sumarlo.
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorPanel({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ error: string | null; createdAt: string; model?: string; expenseId?: number | null; messageType?: string | null }>;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin errores recientes.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div key={`${row.createdAt}-${index}`} className="rounded-lg border border-border/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium">{row.error || "Error sin detalle"}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(row.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.model || row.messageType || "evento"}{row.expenseId ? ` - gasto #${row.expenseId}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value || 0);
}

function formatTokens(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M tokens`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K tokens`;
  return `${value.toLocaleString("es-AR")} tokens`;
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function timeAgo(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}
