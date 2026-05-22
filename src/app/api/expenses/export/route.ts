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

    let query = supabase
      .from("expenses")
      .select("*, expense_categories(name), users_profile!created_by_profile_id(full_name)")
      .order("expense_date", { ascending: false });

    if (from) query = query.gte("expense_date", from);
    if (to) query = query.lte("expense_date", to);
    if (partnerId) query = query.eq("created_by_profile_id", partnerId);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (status) query = query.eq("review_status", status);

    const { data: expenses, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Build CSV
    const headers = [
      "ID", "Fecha del gasto", "Fecha de carga", "Socio",
      "Proveedor", "Categoría", "Descripción", "Monto",
      "Moneda", "Método de pago", "Estado", "Confianza IA",
    ];

    const rows = (expenses || []).map((e) => [
      e.id,
      e.expense_date || "",
      e.created_at ? new Date(e.created_at).toLocaleDateString("es-AR") : "",
      e.whatsapp_sender_name || (e.users_profile as unknown as { full_name: string })?.full_name || "",
      e.supplier_name || "",
      (e.expense_categories as unknown as { name: string })?.name || "",
      (e.description || "").replace(/"/g, '""'),
      e.total_amount || 0,
      e.currency || "ARS",
      e.payment_method || "",
      e.review_status || "",
      e.ai_confidence ? Math.round(e.ai_confidence * 100) + "%" : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => {
          const str = String(cell);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str}"`
            : str;
        }).join(",")
      ),
    ].join("\n");

    // Add BOM for Excel UTF-8 compatibility
    const bom = "\uFEFF";

    return new NextResponse(bom + csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="gastos_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
