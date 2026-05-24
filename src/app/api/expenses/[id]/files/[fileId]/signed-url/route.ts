import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { parsePositiveIntegerParam } from "@/lib/expenses";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, fileId } = await params;
    const expenseId = parsePositiveIntegerParam(id, 0);

    if (expenseId === 0) {
      return NextResponse.json({ error: "Invalid expense id" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("users_profile")
      .select("organization_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }

    const service = await createServiceClient();
    const { data: file, error: fileError } = await service
      .from("expense_files")
      .select(`
        id,
        expense_id,
        organization_id,
        storage_bucket,
        storage_path,
        original_filename,
        mime_type,
        expenses!inner(id, organization_id)
      `)
      .eq("id", fileId)
      .eq("expense_id", expenseId)
      .eq("organization_id", profile.organization_id)
      .single();

    if (fileError || !file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const shouldDownload = request.nextUrl.searchParams.get("download") === "1";
    const { data, error } = await service.storage
      .from(file.storage_bucket)
      .createSignedUrl(file.storage_path, 60 * 5, {
        download: shouldDownload ? file.original_filename || true : false,
      });

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: "Could not create signed URL" }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      filename: file.original_filename,
      mimeType: file.mime_type,
      expiresIn: 60 * 5,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
