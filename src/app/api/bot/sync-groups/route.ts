import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const PRESET_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#84cc16", // Lime
];

export async function POST(request: NextRequest) {
  try {
    // 1. Validate webhook secret
    const webhookSecret = request.headers.get("x-webhook-secret");
    if (webhookSecret !== process.env.BOT_WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { groups } = await request.json();
    if (!groups || !Array.isArray(groups)) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // 2. Get default organization (since there is only one)
    const { data: orgs, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, whatsapp_group_id")
      .limit(1);

    if (orgError || !orgs || orgs.length === 0) {
      return NextResponse.json({ ok: false, error: "No organization found" }, { status: 404 });
    }

    const defaultOrg = orgs[0];
    const syncedGroupIds = groups.map((g) => g.id);

    // 3. Process each group
    for (const group of groups) {
      // Set default organization_id
      const groupOrgId = defaultOrg.id;

      // Upsert group in whatsapp_groups
      const { error: groupUpsertError } = await supabase
        .from("whatsapp_groups")
        .upsert({
          id: group.id,
          name: group.name,
          is_active: true,
          member_count: group.member_count,
          participants: group.participants,
          organization_id: groupOrgId,
          updated_at: new Date().toISOString(),
        });

      if (groupUpsertError) {
        console.error(`Error upserting group ${group.id}:`, groupUpsertError);
        continue;
      }

      // Automatically link the organization to this group if it's the only one
      if (!defaultOrg.whatsapp_group_id) {
        await supabase
          .from("organizations")
          .update({ whatsapp_group_id: group.id })
          .eq("id", defaultOrg.id);
        defaultOrg.whatsapp_group_id = group.id;
      }

      // 4. If this group is linked to our organization, sync members as profiles
      if (defaultOrg.whatsapp_group_id === group.id) {
        for (const p of group.participants) {
          const cleanPhone = p.phone;

          // Check if profile exists
          const { data: existingProfile } = await supabase
            .from("users_profile")
            .select("id, full_name")
            .eq("organization_id", groupOrgId)
            .eq("whatsapp_phone", cleanPhone)
            .maybeSingle();

          if (!existingProfile) {
            // Assign a random color
            const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];

            // Create profile
            const { error: insertError } = await supabase
              .from("users_profile")
              .insert({
                organization_id: groupOrgId,
                full_name: p.pushname || `Socio ${cleanPhone}`,
                whatsapp_phone: cleanPhone,
                role: "partner",
                is_active: true,
                color: randomColor,
              });

            if (insertError) {
              console.error(`Error creating profile for ${cleanPhone}:`, insertError);
            }
          }
        }
      }
    }

    // 5. Mark other groups not in active list as inactive
    if (syncedGroupIds.length > 0) {
      await supabase
        .from("whatsapp_groups")
        .update({ is_active: false })
        .not("id", "in", `(${syncedGroupIds.join(",")})`);
    }

    return NextResponse.json({ ok: true, synced_count: groups.length });
  } catch (error) {
    console.error("Sync groups API error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
