"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Loader2,
  Calendar,
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
} from "recharts";
import type { Expense, UserProfile } from "@/lib/types";

const CATEGORY_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#84cc16", // Lime
];

const DEFAULT_PARTNER_COLOR = "#6b7280"; // Gray

export default function DashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activePartnerCount, setActivePartnerCount] = useState(0);

  // Statistics state
  const [totalThisMonth, setTotalThisMonth] = useState(0);
  const [totalHistorical, setTotalHistorical] = useState(0);
  const [pendingReview, setPendingReview] = useState(0);
  const [totalExpensesCount, setTotalExpensesCount] = useState(0);

  const [categoryChartData, setCategoryChartData] = useState<{ name: string; total: number; fill: string }[]>([]);
  const [partnerChartData, setPartnerChartData] = useState<{ name: string; total: number; fill: string }[]>([]);
  const [weeklyChartData, setWeeklyChartData] = useState<{ date: string; gastos: number }[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);

        // 1. Fetch active partners count
        const { data: activeProfiles } = await supabase
          .from("users_profile")
          .select("id")
          .eq("is_active", true);
        setActivePartnerCount(activeProfiles?.length || 0);

        // 2. Fetch all expenses with category and profile
        const { data: expensesData, error: expensesError } = await supabase
          .from("expenses")
          .select(`
            *,
            category:expense_categories(*),
            created_by:users_profile(*)
          `)
          .order("created_at", { ascending: false });

        if (expensesError) throw expensesError;

        const allExpenses = (expensesData || []) as Expense[];
        setExpenses(allExpenses);
        setTotalExpensesCount(allExpenses.length);

        // 3. Calculate statistics
        let historicalSum = 0;
        let monthlySum = 0;
        let pendingCount = 0;

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-indexed

        allExpenses.forEach((exp) => {
          const amt = Number(exp.total_amount || 0);
          historicalSum += amt;

          if (exp.review_status === "pending") {
            pendingCount++;
          }

          // Check if expense is in current month
          const expDateStr = exp.expense_date || exp.created_at;
          if (expDateStr) {
            const expDate = new Date(expDateStr);
            if (expDate.getFullYear() === currentYear && expDate.getMonth() === currentMonth) {
              monthlySum += amt;
            }
          }
        });

        setTotalHistorical(historicalSum);
        setTotalThisMonth(monthlySum);
        setPendingReview(pendingCount);

        // 4. Calculate Group by Category Chart Data
        const categoryMap: Record<string, number> = {};
        allExpenses.forEach((exp) => {
          const amt = Number(exp.total_amount || 0);
          const catName = exp.category?.name || "Otros";
          categoryMap[catName] = (categoryMap[catName] || 0) + amt;
        });

        const catData = Object.entries(categoryMap)
          .map(([name, total], index) => ({
            name,
            total,
            fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
          }))
          .sort((a, b) => b.total - a.total);
        setCategoryChartData(catData);

        // 5. Calculate Group by Partner Chart Data (using custom colors!)
        const partnerMap: Record<string, { total: number; color: string }> = {};
        allExpenses.forEach((exp) => {
          const amt = Number(exp.total_amount || 0);
          const partnerName = exp.created_by
            ? `${exp.created_by.full_name} ${exp.created_by.last_name || ""}`.trim()
            : exp.whatsapp_sender_name || "Desconocido";

          const color = exp.created_by?.color || DEFAULT_PARTNER_COLOR;

          if (!partnerMap[partnerName]) {
            partnerMap[partnerName] = { total: 0, color };
          }
          partnerMap[partnerName].total += amt;
        });

        const partData = Object.entries(partnerMap)
          .map(([name, { total, color }]) => ({
            name,
            total,
            fill: color,
          }))
          .sort((a, b) => b.total - a.total);
        setPartnerChartData(partData);

        // 6. Calculate Weekly Trend (Current Month)
        // Split current month into 4 weeks: 1-7, 8-14, 15-21, 22+
        const weeklyMap = {
          "Semana 1": 0,
          "Semana 2": 0,
          "Semana 3": 0,
          "Semana 4": 0,
        };

        allExpenses.forEach((exp) => {
          const expDateStr = exp.expense_date || exp.created_at;
          if (expDateStr) {
            const expDate = new Date(expDateStr);
            if (expDate.getFullYear() === currentYear && expDate.getMonth() === currentMonth) {
              const day = expDate.getDate();
              const amt = Number(exp.total_amount || 0);
              if (day <= 7) weeklyMap["Semana 1"] += amt;
              else if (day <= 14) weeklyMap["Semana 2"] += amt;
              else if (day <= 21) weeklyMap["Semana 3"] += amt;
              else weeklyMap["Semana 4"] += amt;
            }
          }
        });

        const wData = Object.entries(weeklyMap).map(([date, gastos]) => ({
          date,
          gastos,
        }));
        setWeeklyChartData(wData);

        // 7. Recent expenses (top 5)
        setRecentExpenses(allExpenses.slice(0, 5));

      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [supabase]);

  // Months name array
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const currentMonthName = months[new Date().getMonth()];
  const currentYearStr = new Date().getFullYear();

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando estadísticas del negocio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            Resumen general de gastos — {currentMonthName} {currentYearStr}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <MetricCard
          title="Total este mes"
          value={formatCurrency(totalThisMonth)}
          subtitle={`Mes de ${currentMonthName}`}
          icon={DollarSign}
        />
        <MetricCard
          title="Total histórico"
          value={formatCurrency(totalHistorical)}
          subtitle={`${totalExpensesCount} comprobantes cargados`}
          icon={TrendingUp}
        />
        <MetricCard
          title="Pendientes de revisión"
          value={pendingReview.toString()}
          subtitle="Requieren validación manual"
          icon={Clock}
          trend={pendingReview > 0 ? "warning" : undefined}
        />
        <MetricCard
          title="Socios activos"
          value={activePartnerCount.toString()}
          subtitle="Integrantes en el grupo"
          icon={Users}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart — Category breakdown */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Gastos por Categoría</CardTitle>
            <CardDescription>Distribución acumulada por tipo de gasto</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {categoryChartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                No hay datos de categorías registrados este mes.
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
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
                      formatter={(value) => [formatCurrency(Number(value)), "Monto"]}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid var(--color-border)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: "13px",
                        backgroundColor: "var(--color-background)",
                        color: "var(--color-foreground)",
                      }}
                    />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {categoryChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Donut — Partner distribution */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Por Socio</CardTitle>
            <CardDescription>Gastos rendidos por integrante</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col justify-between h-[300px]">
            {partnerChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Sin datos de socios para mostrar.
              </div>
            ) : (
              <>
                <div className="h-[180px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={partnerChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="total"
                        strokeWidth={0}
                      >
                        {partnerChartData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value) => [formatCurrency(Number(value)), "Gastado"]}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid var(--color-border)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          fontSize: "13px",
                          backgroundColor: "var(--color-background)",
                          color: "var(--color-foreground)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 overflow-y-auto max-h-[100px] pr-1">
                  {partnerChartData.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.fill }}
                      />
                      <span className="text-muted-foreground truncate max-w-[120px]">{p.name}</span>
                      <span className="font-semibold ml-auto">{formatCurrency(p.total)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trend + Recent expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Tendencia Mensual</CardTitle>
            <CardDescription>Evolución del gasto por semana</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
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
                      backgroundColor: "var(--color-background)",
                      color: "var(--color-foreground)",
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
                <CardDescription>Gastos rendidos recientemente en WhatsApp</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                {recentExpenses.length} comprobantes
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentExpenses.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-xl">
                No hay comprobantes cargados en el sistema todavía.
              </div>
            ) : (
              <div className="space-y-3">
                {recentExpenses.map((exp) => {
                  const status = getStatusInfo(exp.review_status || "pending");
                  const partnerName = exp.created_by
                    ? `${exp.created_by.full_name} ${exp.created_by.last_name || ""}`.trim()
                    : exp.whatsapp_sender_name || "Desconocido";
                  
                  const initials = exp.created_by?.full_name ? exp.created_by.full_name[0].toUpperCase() : (exp.whatsapp_sender_name?.[0] || "?");
                  const partnerColor = exp.created_by?.color || DEFAULT_PARTNER_COLOR;
                  const avatarStyle = { backgroundColor: `${partnerColor}15`, color: partnerColor };

                  return (
                    <div
                      key={exp.id}
                      className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer group"
                    >
                      <Avatar className="h-9 w-9 shrink-0 border border-border/20">
                        <AvatarFallback className="text-xs font-bold" style={avatarStyle}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {exp.supplier_name || "Proveedor no detectado"}
                          </p>
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dotColor}`} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {exp.description || "Sin descripción"} — {partnerName}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">
                          {formatCurrency(exp.total_amount || 0, exp.currency)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {timeAgo(exp.created_at)}
                        </p>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 group border border-border/60 hover:border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <div className="flex items-center gap-1">
              {trend === "up" && (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
              )}
              {trend === "warning" && (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              )}
              {!trend && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
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
