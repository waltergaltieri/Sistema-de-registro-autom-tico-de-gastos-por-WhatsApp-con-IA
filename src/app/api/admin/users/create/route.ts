import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { canMergeDuplicatePhoneProfile } from "@/lib/user-profile-merge";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify caller session
    const supabaseUser = await createClient();
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !caller) {
      return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
    }

    // 2. Fetch caller role
    const { data: callerProfile, error: profileError } = await supabaseUser
      .from("users_profile")
      .select("role, organization_id")
      .eq("auth_user_id", caller.id)
      .single();

    if (profileError || !callerProfile) {
      return NextResponse.json({ ok: false, error: "Perfil de administrador no encontrado" }, { status: 403 });
    }

    if (callerProfile.role !== "admin" && callerProfile.role !== "super_admin") {
      return NextResponse.json({ ok: false, error: "Permiso denegado. Se requiere rol administrador." }, { status: 403 });
    }

    // 3. Parse request payload
    const body = await request.json();
    const {
      id, // Profile UUID. If null/undefined/empty, create a new profile.
      full_name,
      last_name,
      email,
      whatsapp_phone,
      role,
      is_active,
      color,
      dni,
      cuil,
      password, // Optional. If provided, create/update password in auth.users.
    } = body;

    if (!full_name || !whatsapp_phone) {
      return NextResponse.json({ ok: false, error: "Nombre y Teléfono son requeridos" }, { status: 400 });
    }

    const supabaseAdmin = await createServiceClient();
    let profileId = id;
    let authUserId: string | null = null;

    // 4. Handle existing or new profile
    if (profileId) {
      // Fetch current profile to check if it already has auth_user_id
      const { data: existingProfile } = await supabaseAdmin
        .from("users_profile")
        .select("auth_user_id, email, organization_id")
        .eq("id", profileId)
        .single();

      if (!existingProfile) {
        return NextResponse.json({ ok: false, error: "Perfil no encontrado" }, { status: 404 });
      }

      authUserId = existingProfile.auth_user_id;

      const { data: duplicatePhoneProfile, error: duplicatePhoneError } =
        await supabaseAdmin
          .from("users_profile")
          .select("id, auth_user_id, role")
          .eq("organization_id", existingProfile.organization_id)
          .eq("whatsapp_phone", whatsapp_phone)
          .neq("id", profileId)
          .maybeSingle();

      if (duplicatePhoneError) {
        console.error("Error checking duplicate phone profile:", duplicatePhoneError);
        return NextResponse.json({ ok: false, error: "Error validando duplicados de WhatsApp" }, { status: 500 });
      }

      if (duplicatePhoneProfile) {
        if (
          !canMergeDuplicatePhoneProfile({
            authUserId: duplicatePhoneProfile.auth_user_id,
            role: duplicatePhoneProfile.role,
          })
        ) {
          return NextResponse.json(
            { ok: false, error: "Ya existe otro socio con este número de WhatsApp" },
            { status: 400 }
          );
        }

        const { error: moveExpensesError } = await supabaseAdmin
          .from("expenses")
          .update({ created_by_profile_id: profileId })
          .eq("created_by_profile_id", duplicatePhoneProfile.id);

        if (moveExpensesError) {
          console.error("Error moving duplicate profile expenses:", moveExpensesError);
          return NextResponse.json({ ok: false, error: "Error fusionando gastos del perfil duplicado" }, { status: 500 });
        }

        const { error: deleteDuplicateError } = await supabaseAdmin
          .from("users_profile")
          .delete()
          .eq("id", duplicatePhoneProfile.id);

        if (deleteDuplicateError) {
          console.error("Error deleting duplicate phone profile:", deleteDuplicateError);
          return NextResponse.json({ ok: false, error: "Error eliminando perfil duplicado" }, { status: 500 });
        }
      }

      // Handle credentials creation or update
      if (password && email) {
        if (!authUserId) {
          // A. Create new Auth User
          const { data: newAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });

          if (createAuthError) {
            console.error("Error creating auth user:", createAuthError);
            return NextResponse.json({ ok: false, error: `Error creando credenciales: ${createAuthError.message}` }, { status: 500 });
          }

          authUserId = newAuthUser.user.id;
        } else {
          // B. Update existing Auth User
          const updateData: { email?: string; password?: string } = { email };
          if (password) updateData.password = password;

          const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
            authUserId,
            updateData
          );

          if (updateAuthError) {
            console.error("Error updating auth user:", updateAuthError);
            return NextResponse.json({ ok: false, error: `Error actualizando credenciales: ${updateAuthError.message}` }, { status: 500 });
          }
        }
      }

      // Update the user profile
      const { error: updateProfileError } = await supabaseAdmin
        .from("users_profile")
        .update({
          full_name,
          last_name,
          email: email || null,
          whatsapp_phone,
          role,
          is_active: is_active ?? true,
          color,
          dni: dni || null,
          cuil: cuil || null,
          auth_user_id: authUserId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);

      if (updateProfileError) {
        console.error("Error updating user profile:", updateProfileError);
        return NextResponse.json({ ok: false, error: "Error al actualizar perfil en la base de datos" }, { status: 500 });
      }
    } else {
      // 5. Create new profile entirely
      // Check if phone number already exists in this organization
      const { data: duplicatePhone } = await supabaseAdmin
        .from("users_profile")
        .select("id")
        .eq("organization_id", callerProfile.organization_id)
        .eq("whatsapp_phone", whatsapp_phone)
        .maybeSingle();

      if (duplicatePhone) {
        return NextResponse.json({ ok: false, error: "Ya existe un socio con este número de WhatsApp" }, { status: 400 });
      }

      // Create auth user first if password and email are provided
      if (password && email) {
        const { data: newAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (createAuthError) {
          console.error("Error creating new auth user:", createAuthError);
          return NextResponse.json({ ok: false, error: `Error creando credenciales: ${createAuthError.message}` }, { status: 500 });
        }

        authUserId = newAuthUser.user.id;
      }

      // Insert profile
      const { data: newProfile, error: insertProfileError } = await supabaseAdmin
        .from("users_profile")
        .insert({
          organization_id: callerProfile.organization_id,
          auth_user_id: authUserId,
          full_name,
          last_name: last_name || null,
          email: email || null,
          whatsapp_phone,
          role: role || "partner",
          is_active: is_active ?? true,
          color: color || "#3b82f6",
          dni: dni || null,
          cuil: cuil || null,
        })
        .select("id")
        .single();

      if (insertProfileError || !newProfile) {
        console.error("Error inserting profile:", insertProfileError);
        return NextResponse.json({ ok: false, error: "Error al crear perfil en la base de datos" }, { status: 500 });
      }

      profileId = newProfile.id;
    }

    return NextResponse.json({ ok: true, profile_id: profileId, auth_user_id: authUserId });
  } catch (error) {
    console.error("Admin user action API error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
