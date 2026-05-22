-- ==========================================
-- Migration 006: Bot Command Queue
-- Run this in Supabase SQL Editor
-- ==========================================

create table if not exists bot_commands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  command text not null, -- 'send_test_message'
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table bot_commands enable row level security;

-- Policies for bot_commands
drop policy if exists "Admins can manage bot commands" on bot_commands;
create policy "Admins can manage bot commands"
  on bot_commands for all
  using (
    organization_id = get_user_org_id()
    and get_user_role() in ('admin', 'super_admin')
  );

-- Enable updated_at trigger
create or replace trigger update_bot_commands_updated_at
  before update on bot_commands
  for each row execute function update_updated_at_column();
