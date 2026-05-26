import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MONTHLY_PRICE_USD = 120;

type OrganizationRow = {
  id: string;
  name: string;
  whatsapp_group_id: string | null;
};

type UserProfileRow = {
  id: string;
  organization_id: string;
  is_active: boolean | null;
  role: string | null;
};

type ExpenseRow = {
  id: number;
  organization_id: string;
  review_status: string | null;
  ai_status: string | null;
  total_amount: number | string | null;
  created_at: string;
};

type ExpenseFileRow = {
  organization_id: string;
  file_size_bytes: number | string | null;
};

type AIUsageRow = {
  organization_id: string;
  expense_id: number | null;
  model: string;
  status: string;
  input_tokens: number | string | null;
  output_tokens: number | string | null;
  total_tokens: number | string | null;
  estimated_cost_usd: number | string | null;
  latency_ms: number | string | null;
  error_message: string | null;
  created_at: string;
};

type BotLogRow = {
  organization_id: string | null;
  processing_status: string | null;
  error_message: string | null;
  message_type: string | null;
  has_media: boolean | null;
  created_at: string;
};

type WhatsAppGroupRow = {
  organization_id: string | null;
  name: string;
  member_count: number | null;
  is_active: boolean | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users_profile")
      .select("role")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const service = await createServiceClient();
    const monthStart = startOfCurrentMonth();

    const [
      organizationsResult,
      profilesResult,
      expensesResult,
      filesResult,
      aiUsageResult,
      botLogsResult,
      botConfigResult,
      groupsResult,
    ] = await Promise.all([
      service.from("organizations").select("id, name, whatsapp_group_id"),
      service.from("users_profile").select("id, organization_id, is_active, role"),
      service
        .from("expenses")
        .select("id, organization_id, review_status, ai_status, total_amount, created_at"),
      service.from("expense_files").select("organization_id, file_size_bytes"),
      service
        .from("ai_usage_logs")
        .select(
          "organization_id, expense_id, model, status, input_tokens, output_tokens, total_tokens, estimated_cost_usd, latency_ms, error_message, created_at"
        )
        .order("created_at", { ascending: false }),
      service
        .from("bot_message_logs")
        .select("organization_id, processing_status, error_message, message_type, has_media, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      service.from("bot_config").select("status, updated_at").eq("id", 1).maybeSingle(),
      service.from("whatsapp_groups").select("organization_id, name, member_count, is_active"),
    ]);

    const organizations = (organizationsResult.data || []) as OrganizationRow[];
    const profiles = (profilesResult.data || []) as UserProfileRow[];
    const expenses = (expensesResult.data || []) as ExpenseRow[];
    const files = (filesResult.data || []) as ExpenseFileRow[];
    const aiUsage = (aiUsageResult.data || []) as AIUsageRow[];
    const botLogs = (botLogsResult.data || []) as BotLogRow[];
    const groups = (groupsResult.data || []) as WhatsAppGroupRow[];
    const botConfig = botConfigResult.data as { status?: string; updated_at?: string } | null;

    const monthlyAiUsage = aiUsage.filter((row) => row.created_at >= monthStart);
    const monthlyExpenses = expenses.filter((row) => row.created_at >= monthStart);
    const monthlyBotLogs = botLogs.filter((row) => row.created_at >= monthStart);
    const monthlyRevenueUsd = organizations.length * MONTHLY_PRICE_USD;
    const monthlyAiCostUsd = sum(monthlyAiUsage, (row) => numberValue(row.estimated_cost_usd));

    const organizationMetrics = organizations.map((org) => {
      const orgProfiles = profiles.filter((row) => row.organization_id === org.id);
      const orgExpenses = expenses.filter((row) => row.organization_id === org.id);
      const orgMonthlyExpenses = monthlyExpenses.filter((row) => row.organization_id === org.id);
      const orgAiUsage = monthlyAiUsage.filter((row) => row.organization_id === org.id);
      const orgFiles = files.filter((row) => row.organization_id === org.id);
      const orgBotLogs = monthlyBotLogs.filter((row) => row.organization_id === org.id);
      const orgGroups = groups.filter((row) => row.organization_id === org.id);
      const aiCostUsd = sum(orgAiUsage, (row) => numberValue(row.estimated_cost_usd));

      return {
        id: org.id,
        name: org.name,
        monthlyRevenueUsd: MONTHLY_PRICE_USD,
        monthlyAiCostUsd: aiCostUsd,
        estimatedAiMarginUsd: MONTHLY_PRICE_USD - aiCostUsd,
        activeUsers: orgProfiles.filter((row) => row.is_active).length,
        totalUsers: orgProfiles.length,
        totalExpenses: orgExpenses.length,
        monthlyExpenses: orgMonthlyExpenses.length,
        pendingReview: orgExpenses.filter((row) => row.review_status === "pending").length,
        aiCalls: orgAiUsage.length,
        aiFailures: orgAiUsage.filter((row) => row.status === "failed").length,
        storageBytes: sum(orgFiles, (row) => numberValue(row.file_size_bytes)),
        botFailures: orgBotLogs.filter((row) => row.processing_status === "failed").length,
        whatsappGroup: orgGroups[0]?.name || null,
        whatsappMembers: sum(orgGroups, (row) => row.member_count || 0),
      };
    });

    const successfulAiUsage = monthlyAiUsage.filter((row) => row.status === "success");
    const totalAiCalls = monthlyAiUsage.length;
    const totalInputTokens = sum(monthlyAiUsage, (row) => numberValue(row.input_tokens));
    const totalOutputTokens = sum(monthlyAiUsage, (row) => numberValue(row.output_tokens));
    const totalStorageBytes = sum(files, (row) => numberValue(row.file_size_bytes));
    const botFailures = monthlyBotLogs.filter((row) => row.processing_status === "failed").length;

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      monthStart,
      pricing: {
        monthlyPriceUsd: MONTHLY_PRICE_USD,
        note: "Margen calculado solo contra costo IA medido; no incluye Supabase, Vercel ni Oracle.",
      },
      bot: {
        status: botConfig?.status || "desconectado",
        updatedAt: botConfig?.updated_at || null,
        monthlyMessages: monthlyBotLogs.length,
        monthlyFailures: botFailures,
      },
      kpis: {
        organizations: organizations.length,
        monthlyRevenueUsd,
        monthlyAiCostUsd,
        estimatedAiMarginUsd: monthlyRevenueUsd - monthlyAiCostUsd,
        aiCalls: totalAiCalls,
        aiSuccessRate: totalAiCalls > 0 ? successfulAiUsage.length / totalAiCalls : 0,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        avgCostPerAiCallUsd: totalAiCalls > 0 ? monthlyAiCostUsd / totalAiCalls : 0,
        avgLatencyMs:
          successfulAiUsage.length > 0
            ? sum(successfulAiUsage, (row) => numberValue(row.latency_ms)) / successfulAiUsage.length
            : 0,
        monthlyReceipts: monthlyExpenses.length,
        pendingReview: expenses.filter((row) => row.review_status === "pending").length,
        storageFiles: files.length,
        storageBytes: totalStorageBytes,
        botFailures,
      },
      organizations: organizationMetrics.sort((a, b) => b.monthlyAiCostUsd - a.monthlyAiCostUsd),
      recentAiErrors: aiUsage
        .filter((row) => row.status === "failed")
        .slice(0, 8)
        .map((row) => ({
          organizationId: row.organization_id,
          expenseId: row.expense_id,
          model: row.model,
          error: row.error_message,
          createdAt: row.created_at,
        })),
      recentBotErrors: botLogs
        .filter((row) => row.processing_status === "failed")
        .slice(0, 8)
        .map((row) => ({
          organizationId: row.organization_id,
          messageType: row.message_type,
          error: row.error_message,
          createdAt: row.created_at,
        })),
    });
  } catch (error) {
    console.error("Super admin metrics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function numberValue(value: number | string | null | undefined) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function sum<T>(rows: T[], read: (row: T) => number) {
  return rows.reduce((total, row) => total + read(row), 0);
}
