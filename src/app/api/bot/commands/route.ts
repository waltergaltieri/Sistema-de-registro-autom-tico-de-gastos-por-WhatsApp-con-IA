import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET: Bot polling for pending commands
export async function GET(request: NextRequest) {
  try {
    const webhookSecret = request.headers.get("x-webhook-secret");
    if (webhookSecret !== process.env.BOT_WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createServiceClient();
    const { data: commands, error } = await supabase
      .from("bot_commands")
      .select("id, organization_id, command, payload, status")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching bot commands:", error);
      return NextResponse.json({ ok: false, error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, commands });
  } catch (error) {
    console.error("GET bot commands error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST: Action routing (poll, resolve, queue)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ ok: false, error: "Missing action" }, { status: 400 });
    }

    // Bot operations (poll & resolve) require webhook secret validation
    if (action === "poll" || action === "resolve") {
      const webhookSecret = request.headers.get("x-webhook-secret");
      if (webhookSecret !== process.env.BOT_WEBHOOK_SECRET) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }

      const supabase = await createServiceClient();

      if (action === "poll") {
        const { data: commands, error } = await supabase
          .from("bot_commands")
          .select("id, organization_id, command, payload, status")
          .eq("status", "pending")
          .order("created_at", { ascending: true });

        if (error) {
          return NextResponse.json({ ok: false, error: "Database error" }, { status: 500 });
        }
        return NextResponse.json({ ok: true, commands });
      }

      if (action === "resolve") {
        const { command_id, status, error_message } = body;
        if (!command_id || !status) {
          return NextResponse.json({ ok: false, error: "Missing command_id or status" }, { status: 400 });
        }

        const { error } = await supabase
          .from("bot_commands")
          .update({
            status,
            error_message: error_message || null,
            updated_at: new Date().toISOString()
          })
          .eq("id", command_id);

        if (error) {
          return NextResponse.json({ ok: false, error: "Database error" }, { status: 500 });
        }
        return NextResponse.json({ ok: true });
      }
    }

    // User enqueuing a command
    if (action === "queue") {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }

      // Verify admin/super_admin role
      const { data: profile } = await supabase
        .from("users_profile")
        .select("role, organization_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }

      const { command, payload } = body;
      if (!command || !payload) {
        return NextResponse.json({ ok: false, error: "Missing command or payload" }, { status: 400 });
      }

      const serviceSupabase = await createServiceClient();
      const { data: newCommand, error } = await serviceSupabase
        .from("bot_commands")
        .insert({
          organization_id: profile.organization_id,
          command,
          payload,
          status: "pending"
        })
        .select("id, status")
        .single();

      if (error) {
        console.error("Error inserting bot command:", error);
        return NextResponse.json({ ok: false, error: "Database error" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, command: newCommand });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("POST bot commands error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
