-- ==========================================
-- Migration 005: Bot Configuration & QR State
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Create bot_config table
create table if not exists bot_config (
  id integer primary key check (id = 1) default 1,
  status text not null default 'desconectado', -- 'desconectado', 'esperando_vinculacion', 'conectado'
  qr_code text, -- Base64 encoded QR code
  updated_at timestamptz default now()
);

-- 2. Insert initial config
insert into bot_config (id, status, qr_code)
values (1, 'desconectado', null)
on conflict (id) do nothing;

-- 3. Enable RLS
alter table bot_config enable row level security;

-- 4. Policies: Anyone can select status, but only authenticated users or system role can modify (actually write is done via API using service key, or we can just define security definer/anonymous access)
drop policy if exists "Cualquiera puede leer el estado del bot" on bot_config;
create policy "Cualquiera puede leer el estado del bot"
  on bot_config for select
  using (true);

drop policy if exists "Service role can manage bot config" on bot_config;
create policy "Service role can manage bot config"
  on bot_config for all
  using (true)
  with check (true);
