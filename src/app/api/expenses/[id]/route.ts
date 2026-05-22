import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const { data, error } = await supabase
      .from("expenses")
      .select(`
        *,
        expense_categories(id, name),
        users_profile!created_by_profile_id(id, full_name),
        expense_files(*),
        expense_audit_logs(*, users_profile!actor_profile_id(id, full_name))
      `)
      .eq("id", parseInt(id))
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
    const expenseId = parseInt(id);
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

    // Allowed fields for update
    const allowedFields = [
      "expense_date", "supplier_name", "supplier_tax_id", "receipt_type",
      "receipt_number", "description", "total_amount", "currency",
      "payment_method", "category_id", "review_status", "notes",
      "created_by_profile_id",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // If status changes to corrected
    if (updates.review_status && updates.review_status !== currentExpense.review_status) {
      // Auto-set to 'corrected' if other fields also changed
      if (Object.keys(updates).length > 1 && updates.review_status === undefined) {
        updates.review_status = "corrected";
      }
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
