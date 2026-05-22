import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("bot_config")
      .select("status, qr_code, updated_at")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Error fetching bot status:", error);
      return NextResponse.json({ ok: false, error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      status: data?.status || "desconectado",
      qr_code: data?.qr_code || null,
      updated_at: data?.updated_at || null
    });
  } catch (error) {
    console.error("Fetch bot status error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
