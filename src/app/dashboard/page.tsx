"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, getStatusInfo, timeAgo } from "@/lib/format";
import {
  DollarSign,
  TrendingUp,
  Clock,
  Users,
  Receipt,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import type { Expense, UserProfile, ExpenseCategory } from "@/lib/types";

// ============================================================
// Demo data for MVP visualization
// ============================================================

const demoExpenses: Partial<Expense>[] = [
  {
    id: 1,
    description: "Compra de pintura y materiales",
    supplier_name: "Easy",
    total_amount: 48500,
    currency: "ARS",
    expense_date: "2026-05-21",
    review_status: "pending",
    ai_confidence: 0.92,
    whatsapp_sender_name: "Walter",
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 2,
    description: "Flete materiales obra",
    supplier_name: "Flete Rápido",
    total_amount: 22000,
    currency: "ARS",
    expense_date: "2026-05-20",
    review_status: "reviewed",
    ai_confidence: 0.88,
    whatsapp_sender_name: "Ana",
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 3,
    description: "Pintura y rodillos",
    supplier_name: "Pinturería Central",
    total_amount: 90000,
    currency: "ARS",
    expense_date: "2026-05-19",
    review_status: "corrected",
    ai_confidence: 0.65,
    whatsapp_sender_name: "Lucía",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 4,
    description: "Seña del local comercial",
    supplier_name: "Inmobiliaria Sur",
    total_amount: 500000,
    currency: "ARS",
    expense_date: "2026-05-18",
    review_status: "reviewed",
    ai_confidence: 0.95,
    whatsapp_sender_name: "Marlon",
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 5,
    description: "Café reunión de socios",
    supplier_name: "Starbucks",
    total_amount: 12300,
    currency: "ARS",
    expense_date: "2026-05-17",
    review_status: "pending",
    ai_confidence: 0.78,
    whatsapp_sender_name: "Walter",
    created_at: new Date(Date.now() - 259200000).toISOString(),
  },
];

const categoryData = [
  { name: "Alquiler", total: 500000, fill: "var(--color-chart-1)" },
  { name: "Obra", total: 320000, fill: "var(--color-chart-2)" },
  { name: "Materiales", total: 180000, fill: "var(--color-chart-3)" },
  { name: "Marketing", total: 75000, fill: "var(--color-chart-4)" },
  { name: "Transporte", total: 55000, fill: "var(--color-chart-5)" },
  { name: "Otros", total: 115000, fill: "var(--color-muted-foreground)" },
];

const partnerData = [
  { name: "Walter", total: 420000, fill: "var(--color-chart-1)" },
  { name: "Marlon", total: 310000, fill: "var(--color-chart-2)" },
  { name: "Ana", total: 280000, fill: "var(--color-chart-3)" },
  { name: "Lucía", total: 235000, fill: "var(--color-chart-4)" },
];

const monthlyData = [
  { date: "Sem 1", gastos: 280000 },
  { date: "Sem 2", gastos: 350000 },
  { date: "Sem 3", gastos: 420000 },
  { date: "Sem 4", gastos: 195000 },
];

// ============================================================
// Dashboard Page
// ============================================================

export default function DashboardPage() {
  const totalThisMonth = 1245000;
  const totalHistorical = 1245000;
  const pendingReview = 3;
  const totalExpenses = 5;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Resumen general de gastos — Mayo 2026
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <MetricCard
          title="Total este mes"
          value={formatCurrency(totalThisMonth)}
          subtitle="+32% vs mes anterior"
          icon={DollarSign}
          trend="up"
        />
        <MetricCard
          title="Total histórico"
          value={formatCurrency(totalHistorical)}
          subtitle={`${totalExpenses} gastos registrados`}
          icon={TrendingUp}
        />
        <MetricCard
          title="Pendientes de revisión"
          value={pendingReview.toString()}
          subtitle="Requieren atención"
          icon={Clock}
          trend="warning"
        />
        <MetricCard
          title="Socios activos"
          value="4"
          subtitle="Todos participando"
          icon={Users}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart — Category breakdown */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Gastos por Categoría</CardTitle>
            <CardDescription>Distribución del gasto este mes</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip
                    formatter={(value) => [formatCurrency(Number(value)), "Total"]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid var(--color-border)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      fontSize: "13px",
                    }}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Donut — Partner distribution */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Por Socio</CardTitle>
            <CardDescription>Aporte de cada socio</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={partnerData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="total"
                    strokeWidth={0}
                  >
                    {partnerData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value) => [formatCurrency(Number(value)), "Total"]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid var(--color-border)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      fontSize: "13px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {partnerData.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: p.fill }}
                  />
                  <span className="text-muted-foreground truncate">{p.name}</span>
                  <span className="font-medium ml-auto">{formatCurrency(p.total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend + Recent expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Tendencia Semanal</CardTitle>
            <CardDescription>Evolución del gasto en mayo</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip
                    formatter={(value) => [formatCurrency(Number(value)), "Gastos"]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid var(--color-border)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      fontSize: "13px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="gastos"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    dot={{ fill: "var(--color-primary)", r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent expenses */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Últimos Comprobantes</CardTitle>
                <CardDescription>Gastos cargados recientemente</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                {demoExpenses.length} registros
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {demoExpenses.map((exp) => {
                const status = getStatusInfo(exp.review_status || "pending");
                return (
                  <div
                    key={exp.id}
                    className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {exp.supplier_name}
                        </p>
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dotColor}`} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {exp.description} — {exp.whatsapp_sender_name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">
                        {formatCurrency(exp.total_amount || 0)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {timeAgo(exp.created_at!)}
                      </p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// Metric Card Component
// ============================================================

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "warning";
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <div className="flex items-center gap-1">
              {trend === "up" && (
                <ArrowUpRight className="w-3.5 h-3.5 text-success" />
              )}
              {trend === "warning" && (
                <AlertTriangle className="w-3.5 h-3.5 text-warning" />
              )}
              {!trend && <CheckCircle2 className="w-3.5 h-3.5 text-success" />}
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
