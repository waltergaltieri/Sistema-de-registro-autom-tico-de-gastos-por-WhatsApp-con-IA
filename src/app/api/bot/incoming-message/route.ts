import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { processExpenseWithGemini } from "@/lib/gemini";
import {
  buildStaleMessageReply,
  buildStorageUploadFailureReply,
  getMaxIncomingMessageAgeHours,
  getOrganizationFileHashFilters,
  isIncomingMessageTooOld,
} from "@/lib/incoming-expense";
import { resolveExpenseCategoryId } from "@/lib/expense-category";
import { buildMissingFieldsPrompt } from "@/lib/expense-reply";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    // 1. Validate webhook secret
    const webhookSecret = request.headers.get("x-webhook-secret");
    if (webhookSecret !== process.env.BOT_WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      message_id,
      chat_id,
      sender_phone,
      sender_name,
      message_text,
      sent_at,
      has_media,
      media,
    } = body;

    const supabase = await createServiceClient();

    // 2. Get organization by WhatsApp group ID
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("whatsapp_group_id", chat_id)
      .single();

    if (!org) {
      return NextResponse.json(
        { ok: false, error: "Group not authorized", reply_text: "⚠️ Este grupo no está autorizado." },
        { status: 403 }
      );
    }

    // 3. Log the incoming message without multiplying retries for the same WhatsApp id.
    const incomingLog = {
      organization_id: org.id,
      whatsapp_message_id: message_id,
      whatsapp_chat_id: chat_id,
      sender_phone,
      sender_name,
      message_type: has_media ? (media?.mime_type?.startsWith("image/") ? "image" : "document") : "text",
      message_text,
      has_media,
      processing_status: "received",
      raw_payload: body,
    };

    const { data: existingLog } = await supabase
      .from("bot_message_logs")
      .select("id")
      .eq("whatsapp_message_id", message_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingLog) {
      await supabase
        .from("bot_message_logs")
        .update(incomingLog)
        .eq("id", existingLog.id);
    } else {
      await supabase.from("bot_message_logs").insert(incomingLog);
    }

    // 4. Reject old WhatsApp messages before touching storage or AI.
    const maxMessageAgeHours = getMaxIncomingMessageAgeHours(
      process.env.BOT_MAX_MESSAGE_AGE_HOURS
    );

    if (isIncomingMessageTooOld(sent_at, new Date(), maxMessageAgeHours)) {
      await supabase
        .from("bot_message_logs")
        .update({
          processing_status: "ignored",
          error_message: "Message too old",
        })
        .eq("whatsapp_message_id", message_id);

      return NextResponse.json(buildStaleMessageReply(maxMessageAgeHours));
    }

    // 5. Check if has media (required for expense registration)
    if (!has_media || !media?.base64) {
      return NextResponse.json({
        ok: false,
        reply_text: "No encontré una imagen o documento para registrar.\nMandá el comprobante como foto, captura o PDF y agregá una aclaración si hace falta.",
      });
    }

    // 6. Check for duplicate message
    const { data: existingExpense } = await supabase
      .from("expenses")
      .select("id")
      .eq("whatsapp_message_id", message_id)
      .single();

    if (existingExpense) {
      return NextResponse.json({
        ok: false,
        reply_text: `⚠️ Este comprobante ya fue procesado (Gasto #${existingExpense.id}).`,
      });
    }

    // 7. Find user profile by phone
    const { data: userProfile } = await supabase
      .from("users_profile")
      .select("id, full_name")
      .eq("organization_id", org.id)
      .eq("whatsapp_phone", sender_phone)
      .single();

    // 8. Upload file to Supabase Storage
    const fileBuffer = Buffer.from(media.base64, "base64");
    const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    const ext = media.mime_type?.split("/")[1] || "jpg";
    const now = new Date();
    const storagePath = `${org.id}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${message_id}/original.${ext}`;

    // Check for duplicate by hash
    let hashDuplicateQuery = supabase
      .from("expense_files")
      .select("expense_id");

    for (const [field, value] of getOrganizationFileHashFilters(org.id, fileHash)) {
      hashDuplicateQuery = hashDuplicateQuery.eq(field, value);
    }

    const { data: hashDuplicate } = await hashDuplicateQuery.single();

    if (hashDuplicate) {
      return NextResponse.json({
        ok: false,
        reply_text: `⚠️ Este archivo ya fue cargado antes (Gasto #${hashDuplicate.expense_id}). Posible duplicado.`,
      });
    }

    const { error: uploadError } = await supabase.storage
      .from("expense-receipts")
      .upload(storagePath, fileBuffer, {
        contentType: media.mime_type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      await supabase
        .from("bot_message_logs")
        .update({
          processing_status: "failed",
          error_message: "Storage upload failed",
        })
        .eq("whatsapp_message_id", message_id);

      return NextResponse.json(buildStorageUploadFailureReply(), { status: 500 });
    }

    // 9. Create preliminary expense record
    const { data: expense, error: insertError } = await supabase
      .from("expenses")
      .insert({
        organization_id: org.id,
        created_by_profile_id: userProfile?.id || null,
        whatsapp_message_id: message_id,
        whatsapp_chat_id: chat_id,
        whatsapp_sender_phone: sender_phone,
        whatsapp_sender_name: sender_name,
        message_text,
        message_sent_at: sent_at,
        ai_status: "processing",
        review_status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !expense) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { ok: false, error: "Failed to create expense", reply_text: "⚠️ No pude registrar el gasto. Intentá de nuevo." },
        { status: 500 }
      );
    }

    // 10. Save file record
    const { error: fileInsertError } = await supabase.from("expense_files").insert({
      organization_id: org.id,
      expense_id: expense.id,
      storage_bucket: "expense-receipts",
      storage_path: storagePath,
      original_filename: media.filename,
      mime_type: media.mime_type,
      file_size_bytes: fileBuffer.length,
      file_sha256: fileHash,
    });

    if (fileInsertError) {
      console.error("Expense file insert error:", fileInsertError);
      await supabase
        .from("expenses")
        .update({ ai_status: "failed" })
        .eq("id", expense.id);

      await supabase
        .from("bot_message_logs")
        .update({
          processing_status: "failed",
          error_message: "Expense file insert failed",
        })
        .eq("whatsapp_message_id", message_id);

      return NextResponse.json(
        {
          ok: false,
          error: "Failed to save expense file",
          reply_text: "âš ï¸ No pude guardar el archivo del comprobante. IntentÃ¡ enviarlo nuevamente.",
        },
        { status: 500 }
      );
    }

    // 11. Get categories for AI context
    const { data: categories } = await supabase
      .from("expense_categories")
      .select("id, name")
      .eq("organization_id", org.id)
      .eq("is_active", true);

    const categoryNames = categories?.map((c) => c.name) || [];

    // 11. Process with Gemini
    let aiResult;
    try {
      aiResult = await processExpenseWithGemini({
        imageBase64: media.base64,
        mimeType: media.mime_type,
        messageText: message_text || "",
        senderName: userProfile?.full_name || sender_name,
        sentAt: sent_at,
        categories: categoryNames,
      });
    } catch (aiError) {
      console.error("Gemini error:", aiError);
      await supabase
        .from("expenses")
        .update({ ai_status: "failed" })
        .eq("id", expense.id);

      return NextResponse.json({
        ok: true,
        expense_id: expense.id,
        reply_text: `⚠️ Registré el comprobante (#${expense.id}) pero no pude analizarlo con IA. Revisalo desde el dashboard.`,
      });
    }

    // 12. Match category. Unknown receipts fall back to the explicit "Otros" category.
    const categoryId = resolveExpenseCategoryId(
      categories || [],
      aiResult.suggested_category_name
    );

    // 13. Determine review status
    const reviewStatus = "pending";
    let aiStatus = "processed";
    if (aiResult.confidence < 0.5 || !aiResult.total_amount) {
      aiStatus = "needs_review";
    }

    // 14. Update expense with AI results
    await supabase
      .from("expenses")
      .update({
        category_id: categoryId,
        expense_date: aiResult.expense_date,
        supplier_name: aiResult.supplier_name,
        supplier_tax_id: aiResult.supplier_tax_id,
        receipt_type: aiResult.receipt_type,
        receipt_number: aiResult.receipt_number,
        description: aiResult.description,
        total_amount: aiResult.total_amount,
        currency: aiResult.currency || "ARS",
        payment_method: aiResult.payment_method,
        ai_confidence: aiResult.confidence,
        ai_status: aiStatus,
        review_status: reviewStatus,
        raw_ai_response: aiResult as unknown as Record<string, unknown>,
        extracted_items: aiResult.items || [],
        doubtful_fields: aiResult.doubtful_fields || [],
      })
      .eq("id", expense.id);

    // 15. Create audit log
    await supabase.from("expense_audit_logs").insert({
      organization_id: org.id,
      expense_id: expense.id,
      actor_profile_id: null,
      action: "created_by_bot",
      new_data: aiResult as unknown as Record<string, unknown>,
    });

    // 16. Build reply
    const partnerName = userProfile?.full_name || sender_name;
    let replyText: string;
    const missingFieldsPrompt = buildMissingFieldsPrompt(expense.id, aiResult);

    if (aiResult.confidence >= 0.7 && aiResult.total_amount) {
      replyText = [
        `✅ Gasto registrado`,
        ``,
        `Socio: ${partnerName}`,
        `Proveedor: ${aiResult.supplier_name || "No identificado"}`,
        `Monto: ${aiResult.currency === "USD" ? "US$" : "$"}${aiResult.total_amount?.toLocaleString("es-AR")}`,
        `Fecha del gasto: ${aiResult.expense_date || "No identificada"}`,
        `Categoría: ${aiResult.suggested_category_name || "Sin categoría"}`,
        `Estado: Pendiente de revisión`,
        ``,
        `Si algo está mal, respondé:`,
        `corregir gasto ${expense.id}`,
      ].join("\n");
    } else {
      const doubtfulStr = aiResult.doubtful_fields
        ?.map((d) => `- ${d.field}: ${d.reason}`)
        .join("\n") || "- Datos generales";

      replyText = [
        `⚠️ Cargué el gasto, pero necesito revisión.`,
        ``,
        `No pude confirmar bien estos datos:`,
        doubtfulStr,
        ``,
        `Registro: #${expense.id}`,
        `Podés corregirlo desde el dashboard o responder con una aclaración.`,
      ].join("\n");
    }

    if (missingFieldsPrompt) {
      replyText = `${replyText}\n${missingFieldsPrompt}`;
    }

    // 17. Update bot log status
    await supabase
      .from("bot_message_logs")
      .update({ processing_status: "processed" })
      .eq("whatsapp_message_id", message_id);

    return NextResponse.json({
      ok: true,
      expense_id: expense.id,
      reply_text: replyText,
    });
  } catch (error) {
    console.error("Incoming message error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error", reply_text: "⚠️ Error interno. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
