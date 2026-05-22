import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = request.headers.get("x-webhook-secret");
    if (webhookSecret !== process.env.BOT_WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status, qr_code } = body;

    if (!status) {
      return NextResponse.json({ ok: false, error: "Missing status" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Clear QR code if connected or disconnected to prevent displaying stale QR codes
    const finalQrCode = (status === "conectado" || status === "desconectado") ? null : (qr_code || null);

    const { error } = await supabase
      .from("bot_config")
      .upsert({
        id: 1,
        status,
        qr_code: finalQrCode,
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });

    if (error) {
      console.error("Error updating bot status:", error);
      return NextResponse.json({ ok: false, error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("QR status update error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
