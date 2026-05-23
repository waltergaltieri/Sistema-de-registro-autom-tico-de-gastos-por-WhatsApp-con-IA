import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildExpenseUpdates, parsePositiveIntegerParam } from "@/lib/expenses";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const expenseId = parsePositiveIntegerParam(id, 0);
    if (expenseId === 0) {
      return NextResponse.json({ error: "Invalid expense id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("expenses")
      .select(`
        *,
        expense_categories(id, name),
        users_profile!created_by_profile_id(id, full_name),
        expense_files(*),
        expense_audit_logs(*, users_profile!actor_profile_id(id, full_name))
      `)
      .eq("id", expenseId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const expenseId = parsePositiveIntegerParam(id, 0);
    if (expenseId === 0) {
      return NextResponse.json({ error: "Invalid expense id" }, { status: 400 });
    }
    const body = await request.json();

    // Get current expense data for audit
    const { data: currentExpense } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", expenseId)
      .single();

    if (!currentExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Get user profile for audit
    const { data: profile } = await supabase
      .from("users_profile")
      .select("id, organization_id")
      .eq("auth_user_id", user.id)
      .single();

    let updates: Record<string, unknown>;
    try {
      updates = buildExpenseUpdates(body, currentExpense.review_status);
    } catch {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Update expense
    const { data, error } = await supabase
      .from("expenses")
      .update(updates)
      .eq("id", expenseId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create audit log
    const action = updates.review_status === "reviewed"
      ? "marked_reviewed"
      : updates.review_status === "rejected"
        ? "rejected"
        : "edited_by_user";

    await supabase.from("expense_audit_logs").insert({
      organization_id: profile?.organization_id || currentExpense.organization_id,
      expense_id: expenseId,
      actor_profile_id: profile?.id || null,
      action,
      old_data: currentExpense,
      new_data: updates,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
