-- ==========================================
-- Gastos Socios — Database Migration
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Organizations
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp_group_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. User Profiles
create table if not exists users_profile (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id),
  organization_id uuid references organizations(id) not null,
  full_name text not null,
  email text,
  whatsapp_phone text not null,
  role text not null default 'partner',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(organization_id, whatsapp_phone)
);

-- 3. Expense Categories
create table if not exists expense_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) not null,
  name text not null,
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(organization_id, name)
);

-- 4. Expenses
create table if not exists expenses (
  id bigserial primary key,
  organization_id uuid references organizations(id) not null,
  created_by_profile_id uuid references users_profile(id),
  category_id uuid references expense_categories(id),

  -- WhatsApp metadata
  whatsapp_message_id text unique,
  whatsapp_chat_id text,
  whatsapp_sender_phone text,
  whatsapp_sender_name text,
  message_text text,
  message_sent_at timestamptz,

  -- Expense data
  expense_date date,
  supplier_name text,
  supplier_tax_id text,
  receipt_type text,
  receipt_number text,

  description text,
  total_amount numeric(14,2),
  currency text default 'ARS',
  payment_method text,

  -- AI data
  ai_confidence numeric(4,3),
  ai_status text default 'processed',
  review_status text default 'pending',

  raw_ai_response jsonb,
  extracted_items jsonb,
  doubtful_fields jsonb,

  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Expense Files
create table if not exists expense_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) not null,
  expense_id bigint references expenses(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  original_filename text,
  mime_type text,
  file_size_bytes bigint,
  file_sha256 text,
  created_at timestamptz default now()
);

-- 6. Expense Audit Logs
create table if not exists expense_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) not null,
  expense_id bigint references expenses(id) on delete cascade,
  actor_profile_id uuid references users_profile(id),
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz default now()
);

-- 7. Bot Message Logs
create table if not exists bot_message_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  whatsapp_message_id text,
  whatsapp_chat_id text,
  sender_phone text,
  sender_name text,
  message_type text,
  message_text text,
  has_media boolean default false,
  processing_status text default 'received',
  error_message text,
  raw_payload jsonb,
  created_at timestamptz default now()
);

-- 8. Query Logs
create table if not exists query_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) not null,
  requester_profile_id uuid references users_profile(id),
  channel text default 'whatsapp',
  question text not null,
  generated_sql text,
  answer text,
  created_at timestamptz default now()
);

-- ==========================================
-- Indexes
-- ==========================================

create index if not exists idx_expenses_org on expenses(organization_id);
create index if not exists idx_expenses_date on expenses(expense_date);
create index if not exists idx_expenses_status on expenses(review_status);
create index if not exists idx_expenses_ai_status on expenses(ai_status);
create index if not exists idx_expenses_category on expenses(category_id);
create index if not exists idx_expenses_created_by on expenses(created_by_profile_id);
create index if not exists idx_expense_files_expense on expense_files(expense_id);
create index if not exists idx_audit_expense on expense_audit_logs(expense_id);
create index if not exists idx_bot_logs_status on bot_message_logs(processing_status);

-- ==========================================
-- Updated_at trigger
-- ==========================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger update_organizations_updated_at
  before update on organizations
  for each row execute function update_updated_at_column();

create or replace trigger update_users_profile_updated_at
  before update on users_profile
  for each row execute function update_updated_at_column();

create or replace trigger update_expenses_updated_at
  before update on expenses
  for each row execute function update_updated_at_column();
