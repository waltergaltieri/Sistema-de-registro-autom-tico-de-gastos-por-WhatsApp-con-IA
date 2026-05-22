-- ==========================================
-- Row Level Security Policies
-- Run after schema migration
-- ==========================================

-- Enable RLS on all tables
alter table organizations enable row level security;
alter table users_profile enable row level security;
alter table expense_categories enable row level security;
alter table expenses enable row level security;
alter table expense_files enable row level security;
alter table expense_audit_logs enable row level security;
alter table bot_message_logs enable row level security;
alter table query_logs enable row level security;

-- ==========================================
-- Helper function: get user's organization
-- ==========================================

create or replace function get_user_org_id()
returns uuid as $$
  select organization_id
  from users_profile
  where auth_user_id = auth.uid()
  limit 1;
$$ language sql security definer stable;

-- ==========================================
-- Organizations
-- ==========================================

create policy "Users can view their own organization"
  on organizations for select
  using (id = get_user_org_id());

-- ==========================================
-- User Profiles
-- ==========================================

create policy "Users can view profiles in their org"
  on users_profile for select
  using (organization_id = get_user_org_id());

create policy "Admins can manage profiles in their org"
  on users_profile for all
  using (
    organization_id = get_user_org_id()
    and exists (
      select 1 from users_profile
      where auth_user_id = auth.uid()
      and role = 'admin'
    )
  );

-- ==========================================
-- Expense Categories
-- ==========================================

create policy "Users can view categories in their org"
  on expense_categories for select
  using (organization_id = get_user_org_id());

create policy "Admins can manage categories"
  on expense_categories for all
  using (
    organization_id = get_user_org_id()
    and exists (
      select 1 from users_profile
      where auth_user_id = auth.uid()
      and role = 'admin'
    )
  );

-- ==========================================
-- Expenses
-- ==========================================

create policy "Users can view expenses in their org"
  on expenses for select
  using (organization_id = get_user_org_id());

create policy "Users can insert expenses in their org"
  on expenses for insert
  with check (organization_id = get_user_org_id());

create policy "Users can update expenses in their org"
  on expenses for update
  using (organization_id = get_user_org_id());

-- ==========================================
-- Expense Files
-- ==========================================

create policy "Users can view files in their org"
  on expense_files for select
  using (organization_id = get_user_org_id());

-- ==========================================
-- Audit Logs
-- ==========================================

create policy "Users can view audit logs in their org"
  on expense_audit_logs for select
  using (organization_id = get_user_org_id());

create policy "Users can insert audit logs in their org"
  on expense_audit_logs for insert
  with check (organization_id = get_user_org_id());

-- ==========================================
-- Bot Message Logs
-- ==========================================

create policy "Admins can view bot logs in their org"
  on bot_message_logs for select
  using (
    organization_id = get_user_org_id()
    and exists (
      select 1 from users_profile
      where auth_user_id = auth.uid()
      and role = 'admin'
    )
  );

-- ==========================================
-- Query Logs
-- ==========================================

create policy "Users can view query logs in their org"
  on query_logs for select
  using (organization_id = get_user_org_id());

-- ==========================================
-- Storage Bucket
-- ==========================================

-- Create bucket (run in Supabase Dashboard or via API)
-- insert into storage.buckets (id, name, public)
-- values ('expense-receipts', 'expense-receipts', false);

-- Storage policies
-- create policy "Authenticated users can view org receipts"
--   on storage.objects for select
--   using (
--     bucket_id = 'expense-receipts'
--     and auth.role() = 'authenticated'
--   );
