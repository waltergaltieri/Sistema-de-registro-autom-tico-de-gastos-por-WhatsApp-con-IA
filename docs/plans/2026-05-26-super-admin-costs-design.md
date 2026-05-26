# Super Admin Costs Dashboard Design

## Goal

Build a super-admin-only dashboard to monitor AI usage, estimated AI spend, system activity, Supabase-backed storage usage, and bot health.

## Chosen Approach

Use approach B: add real AI usage logging from every Gemini receipt analysis, then display cost and operational metrics in a dedicated `/dashboard/super-admin` page. Historical costs before this change are not backfilled because token usage was not persisted.

## Data Model

Add `ai_usage_logs` with one row per Gemini attempt. Store organization, expense, provider, model, status, token counts, pricing snapshot, estimated USD cost, latency, error message, and raw usage metadata. This keeps reports auditable even if prices change later.

## Cost Calculation

Use Gemini API usage metadata when present:

- input tokens: `usageMetadata.promptTokenCount`
- output tokens: `usageMetadata.candidatesTokenCount`
- total tokens: `usageMetadata.totalTokenCount`

For `gemini-2.5-flash-lite` standard tier, the pricing snapshot defaults to USD 0.10 per 1M input tokens and USD 0.40 per 1M output tokens, based on Google AI pricing checked on 2026-05-26.

## UI

Add `/dashboard/super-admin` to the sidebar for `super_admin` only. The screen should be dense and operational:

- revenue and margin card based on USD 120/month per organization
- AI monthly spend, calls, tokens, average cost per receipt
- receipts processed, failed bot messages, pending review rate
- storage files and bytes from `expense_files`
- organization table with activity, AI spend, storage, users, and groups
- recent AI errors and bot errors

## Access Control

The API route must verify the authenticated user's profile role is `super_admin`. Data aggregation should run with the Supabase service client after that check, so the page can see cross-organization metrics without loosening RLS.

## Limits

Supabase billing and Oracle CPU/RAM are not directly available inside the current app. This dashboard will show DB-derived usage now, and leaves a clear extension point for a future Oracle health endpoint.
