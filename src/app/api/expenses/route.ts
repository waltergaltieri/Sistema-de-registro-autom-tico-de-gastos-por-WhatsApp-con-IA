import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const partnerId = searchParams.get("partner_id");
    const categoryId = searchParams.get("category_id");
    const status = searchParams.get("status");
    const supplier = searchParams.get("supplier");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = supabase
      .from("expenses")
      .select("*, expense_categories(id, name), users_profile!created_by_profile_id(id, full_name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (from) query = query.gte("expense_date", from);
    if (to) query = query.lte("expense_date", to);
    if (partnerId) query = query.eq("created_by_profile_id", partnerId);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (status) query = query.eq("review_status", status);
    if (supplier) query = query.ilike("supplier_name", `%${supplier}%`);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, total: count, page, limit });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
