# Super Admin Costs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real Gemini usage logging and a super-admin-only cost monitoring dashboard.

**Architecture:** Persist AI usage per Gemini attempt in `ai_usage_logs`, calculate cost using a pricing snapshot, expose aggregated metrics through a protected API route, and render `/dashboard/super-admin` for `super_admin` only. The page uses existing Supabase SSR/client patterns and the existing dashboard shell.

**Tech Stack:** Next.js App Router, React, Supabase Postgres/Storage, Gemini REST API, Vitest.

---

### Task 1: Add AI Usage Schema

**Files:**
- Create: `supabase/009_ai_usage_logs.sql`
- Modify: `src/lib/types.ts`

**Steps:**
1. Create `ai_usage_logs` with organization, expense, provider, model, status, token counts, price snapshot, estimated cost, latency, error, raw usage metadata, and timestamps.
2. Enable RLS and allow `super_admin` read access through existing `get_user_role()`.
3. Add indexes for month, organization, expense, and status.
4. Add TypeScript interface for dashboard/API use.

### Task 2: Capture Gemini Usage

**Files:**
- Modify: `src/lib/gemini.ts`
- Modify: `src/app/api/bot/incoming-message/route.ts`
- Test: `src/lib/gemini.test.ts`

**Steps:**
1. Return parsed Gemini data plus model, usage metadata, latency, and estimated cost.
2. Log one `ai_usage_logs` row on successful Gemini analysis.
3. Log one failed `ai_usage_logs` row when Gemini errors after the expense exists.
4. Keep the existing receipt flow and WhatsApp replies unchanged.

### Task 3: Add Super Admin Metrics API

**Files:**
- Create: `src/app/api/super-admin/metrics/route.ts`

**Steps:**
1. Verify session with regular Supabase client.
2. Verify profile role is exactly `super_admin`.
3. Aggregate current-month and all-time metrics with the service client.
4. Return KPI cards, organization rows, recent AI errors, and recent bot errors.

### Task 4: Add Dashboard Page

**Files:**
- Create: `src/app/dashboard/super-admin/page.tsx`
- Modify: `src/app/dashboard/layout.tsx`

**Steps:**
1. Add sidebar item visible only to `super_admin`.
2. Fetch metrics from `/api/super-admin/metrics`.
3. Render cards, organization table, and error panels.
4. Include loading, unauthorized/error, and empty states.

### Task 5: Verify and Deploy

**Commands:**
- `npm test`
- `npm run build`
- apply `supabase/009_ai_usage_logs.sql` to production database
- `git add ... && git commit -m "feat: add super admin cost dashboard"`
- `git push`
- confirm Vercel deployment is Ready
