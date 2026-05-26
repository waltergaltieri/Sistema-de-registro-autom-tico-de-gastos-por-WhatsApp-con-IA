-- ==========================================
-- Migration 009: AI Usage Logs
-- Run this in Supabase SQL Editor
-- ==========================================

create table if not exists ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) not null,
  expense_id bigint references expenses(id) on delete set null,
  provider text not null default 'google_gemini',
  model text not null,
  operation text not null default 'receipt_analysis',
  status text not null default 'success',
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  input_cost_per_1m_usd numeric(12,6) not null default 0,
  output_cost_per_1m_usd numeric(12,6) not null default 0,
  estimated_cost_usd numeric(14,8) not null default 0,
  latency_ms integer,
  error_message text,
  raw_usage jsonb,
  created_at timestamptz default now()
);

alter table ai_usage_logs enable row level security;

drop policy if exists "Super admins can view ai usage logs" on ai_usage_logs;
create policy "Super admins can view ai usage logs"
  on ai_usage_logs for select
  using (get_user_role() = 'super_admin');

create index if not exists idx_ai_usage_logs_created_at on ai_usage_logs(created_at desc);
create index if not exists idx_ai_usage_logs_org on ai_usage_logs(organization_id);
create index if not exists idx_ai_usage_logs_expense on ai_usage_logs(expense_id);
create index if not exists idx_ai_usage_logs_status on ai_usage_logs(status);
