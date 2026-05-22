-- ==========================================
-- Migration 004: Admin & User Extensions + WhatsApp Groups
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Extend user profiles table with DNI, CUIL, Last Name and Color
alter table users_profile add column if not exists last_name text;
alter table users_profile add column if not exists dni text;
alter table users_profile add column if not exists cuil text;
alter table users_profile add column if not exists color text;

-- 2. Create WhatsApp Groups table
create table if not exists whatsapp_groups (
  id text primary key, -- WhatsApp JID (e.g. 12036321283818318@g.us)
  name text not null,
  is_active boolean not null default true,
  member_count integer not null default 0,
  participants jsonb not null default '[]'::jsonb,
  organization_id uuid references organizations(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on whatsapp_groups
alter table whatsapp_groups enable row level security;

-- ==========================================
-- Helper function: get user's role
-- ==========================================

create or replace function get_user_role()
returns text as $$
  select role
  from users_profile
  where auth_user_id = auth.uid()
  limit 1;
$$ language sql security definer stable;

-- 3. Update / Create RLS Policies

-- For whatsapp_groups: Only super_admin can manage and read whatsapp_groups
drop policy if exists "Super admins can manage whatsapp groups" on whatsapp_groups;
create policy "Super admins can manage whatsapp groups"
  on whatsapp_groups for all
  using (
    get_user_role() = 'super_admin'
  );

-- For users_profile: Drop old admin policy and create a new one supporting admin and super_admin without recursion
drop policy if exists "Admins can manage profiles in their org" on users_profile;
create policy "Admins can manage profiles in their org"
  on users_profile for all
  using (
    organization_id = get_user_org_id()
    and get_user_role() in ('admin', 'super_admin')
  );

-- For expense_categories: Drop old admin policy and create a new one supporting admin and super_admin without recursion
drop policy if exists "Admins can manage categories" on expense_categories;
create policy "Admins can manage categories"
  on expense_categories for all
  using (
    organization_id = get_user_org_id()
    and get_user_role() in ('admin', 'super_admin')
  );

-- For bot_message_logs: Drop old admin policy and create a new one supporting admin and super_admin without recursion
drop policy if exists "Admins can view bot logs in their org" on bot_message_logs;
create policy "Admins can view bot logs in their org"
  on bot_message_logs for select
  using (
    organization_id = get_user_org_id()
    and get_user_role() in ('admin', 'super_admin')
  );

-- Ensure there is a trigger for updated_at on whatsapp_groups
create or replace trigger update_whatsapp_groups_updated_at
  before update on whatsapp_groups
  for each row execute function update_updated_at_column();
