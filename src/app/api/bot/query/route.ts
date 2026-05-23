import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import {
  buildExpenseCorrectionUpdate,
  parseExpenseCorrectionCommands,
} from "@/lib/expense-correction-command";

function normalizeCategoryName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function resolveExactCategoryId(
  categories: { id: string; name: string }[],
  categoryName: string
) {
  const target = normalizeCategoryName(categoryName);
  return (
    categories.find((category) => normalizeCategoryName(category.name) === target)?.id ||
    categories.find((category) => normalizeCategoryName(category.name).includes(target))?.id ||
    null
  );
}

function getBuenosAiresNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
}

export async function POST(request: NextRequest) {
  try {
    // Validate webhook secret
    const webhookSecret = request.headers.get("x-webhook-secret");
    if (webhookSecret !== process.env.BOT_WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { chat_id, sender_phone, message_text } = body;

    const supabase = await createServiceClient();

    // Get organization
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("whatsapp_group_id", chat_id)
      .single();

    if (!org) {
      return NextResponse.json({ ok: false, reply_text: "Grupo no autorizado." });
    }

    const rawText = (message_text || "").trim();
    const text = rawText.toLowerCase();
    const { data: profile } = await supabase
      .from("users_profile")
      .select("id")
      .eq("organization_id", org.id)
      .eq("whatsapp_phone", sender_phone)
      .single();
    let replyText = "No entendí la consulta. Probá con:\n/gastos total mayo\n/gastos ultimos\n/gastos categoria obra\n/gasto 123";

    // ==========================================
    // Command parsing
    // ==========================================

    const correctionCommands = parseExpenseCorrectionCommands(rawText, getBuenosAiresNow());

    if (correctionCommands.length > 0) {
      const requestedExpenseId = correctionCommands.find((command) => command.expenseId)?.expenseId;
      let expenseQuery = supabase
        .from("expenses")
        .select("id, category_id, expense_date, supplier_name, total_amount, review_status, created_at")
        .eq("organization_id", org.id);

      if (requestedExpenseId) {
        expenseQuery = expenseQuery.eq("id", requestedExpenseId);
      } else {
        expenseQuery = expenseQuery
          .eq("whatsapp_sender_phone", sender_phone)
          .neq("review_status", "rejected")
          .order("created_at", { ascending: false })
          .limit(1);
      }

      const { data: expenses } = await expenseQuery;
      const expense = Array.isArray(expenses) ? expenses[0] : expenses;

      if (!expense) {
        replyText = requestedExpenseId
          ? `No encontre el gasto #${requestedExpenseId}.`
          : "No encontre un gasto reciente tuyo para corregir.";
      } else {
        const { data: categories } = await supabase
          .from("expense_categories")
          .select("id, name")
          .eq("organization_id", org.id)
          .eq("is_active", true);
        const updates: Record<string, unknown> = {};
        const applied: string[] = [];
        let correctionError: string | null = null;

        for (const command of correctionCommands) {
          const categoryId =
            command.field === "categoria"
              ? resolveExactCategoryId(categories || [], command.value)
              : null;
          const correction = buildExpenseCorrectionUpdate(command, categoryId);

          if (!correction.ok) {
            correctionError = correction.error;
            break;
          }

          Object.assign(updates, correction.updates);
          applied.push(`${correction.label} = ${correction.displayValue}`);
        }

        if (correctionError) {
          replyText = `No pude aplicar la correccion: ${correctionError}`;
        } else {
          const { error: updateError } = await supabase
            .from("expenses")
            .update(updates)
            .eq("organization_id", org.id)
            .eq("id", expense.id);

          if (updateError) {
            replyText = "No pude actualizar el gasto. Intenta de nuevo.";
          } else {
            await supabase.from("expense_audit_logs").insert({
              organization_id: org.id,
              expense_id: expense.id,
              actor_profile_id: profile?.id || null,
              action: "corrected_by_whatsapp",
              old_data: expense,
              new_data: updates,
            });

            replyText = `Gasto #${expense.id} actualizado: ${applied.join(", ")}.`;
          }
        }
      }
    } else if (text.startsWith("/gastos total")) {
      // Total expenses for current month
      const { data: expenses } = await supabase
        .from("expenses")
        .select("total_amount, whatsapp_sender_name, created_by_profile_id")
        .eq("organization_id", org.id)
        .neq("review_status", "rejected");

      if (expenses && expenses.length > 0) {
        const total = expenses.reduce((sum, e) => sum + (e.total_amount || 0), 0);

        // Group by sender
        const bySender: Record<string, number> = {};
        expenses.forEach((e) => {
          const name = e.whatsapp_sender_name || "Desconocido";
          bySender[name] = (bySender[name] || 0) + (e.total_amount || 0);
        });

        const breakdown = Object.entries(bySender)
          .sort((a, b) => b[1] - a[1])
          .map(([name, amount]) => `${name}: ${formatCurrency(amount)}`)
          .join("\n");

        replyText = `💰 Total gastado: ${formatCurrency(total)}\n\nPor socio:\n${breakdown}`;
      } else {
        replyText = "No hay gastos registrados todavía.";
      }
    } else if (text.startsWith("/gastos ultimos")) {
      // Last 5 expenses
      const { data: expenses } = await supabase
        .from("expenses")
        .select("id, supplier_name, total_amount, whatsapp_sender_name")
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (expenses && expenses.length > 0) {
        const list = expenses
          .map(
            (e) =>
              `#${e.id} — ${e.supplier_name || "Sin proveedor"} — ${formatCurrency(e.total_amount || 0)} — ${e.whatsapp_sender_name || "?"}`
          )
          .join("\n");

        replyText = `📋 Últimos 5 gastos:\n\n${list}`;
      } else {
        replyText = "No hay gastos registrados todavía.";
      }
    } else if (text.startsWith("/gastos categoria")) {
      // Expenses by category
      const categorySearch = text.replace("/gastos categoria", "").trim();

      const { data: expenses } = await supabase
        .from("expenses")
        .select("total_amount, expense_categories(name)")
        .eq("organization_id", org.id)
        .neq("review_status", "rejected");

      if (expenses && expenses.length > 0) {
        const byCategory: Record<string, { total: number; count: number }> = {};
        expenses.forEach((e) => {
          const catName =
            (e.expense_categories as unknown as { name: string })?.name || "Sin categoría";
          if (!byCategory[catName]) byCategory[catName] = { total: 0, count: 0 };
          byCategory[catName].total += e.total_amount || 0;
          byCategory[catName].count++;
        });

        if (categorySearch) {
          // Filter to specific category
          const match = Object.entries(byCategory).find(([name]) =>
            name.toLowerCase().includes(categorySearch)
          );
          if (match) {
            replyText = `📊 ${match[0]}:\nTotal: ${formatCurrency(match[1].total)}\nCantidad: ${match[1].count} gastos`;
          } else {
            replyText = `No encontré una categoría que coincida con "${categorySearch}".`;
          }
        } else {
          const breakdown = Object.entries(byCategory)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([name, data]) => `${name}: ${formatCurrency(data.total)} (${data.count})`)
            .join("\n");
          replyText = `📊 Gastos por categoría:\n\n${breakdown}`;
        }
      } else {
        replyText = "No hay gastos registrados todavía.";
      }
    } else if (text.startsWith("/gastos proveedor")) {
      const supplierSearch = text.replace("/gastos proveedor", "").trim();

      const { data: expenses } = await supabase
        .from("expenses")
        .select("id, supplier_name, total_amount, expense_date, whatsapp_sender_name")
        .eq("organization_id", org.id)
        .ilike("supplier_name", `%${supplierSearch}%`)
        .order("expense_date", { ascending: false })
        .limit(10);

      if (expenses && expenses.length > 0) {
        const total = expenses.reduce((sum, e) => sum + (e.total_amount || 0), 0);
        const list = expenses
          .map((e) => `#${e.id} — ${e.expense_date || "?"} — ${formatCurrency(e.total_amount || 0)}`)
          .join("\n");

        replyText = `🔍 Gastos en "${supplierSearch}":\nTotal: ${formatCurrency(total)}\n\n${list}`;
      } else {
        replyText = `No encontré gastos con proveedor "${supplierSearch}".`;
      }
    } else if (text.startsWith("/gasto ")) {
      // Expense detail
      const expenseId = parseInt(text.replace("/gasto ", "").trim());

      if (!isNaN(expenseId)) {
        const { data: expense } = await supabase
          .from("expenses")
          .select("*, expense_categories(name)")
          .eq("organization_id", org.id)
          .eq("id", expenseId)
          .single();

        if (expense) {
          const catName = (expense.expense_categories as unknown as { name: string })?.name || "Sin categoría";
          replyText = [
            `📝 Gasto #${expense.id}`,
            ``,
            `Socio: ${expense.whatsapp_sender_name || "?"}`,
            `Proveedor: ${expense.supplier_name || "No identificado"}`,
            `Monto: ${formatCurrency(expense.total_amount, expense.currency)}`,
            `Fecha: ${expense.expense_date || "?"}`,
            `Categoría: ${catName}`,
            `Método: ${expense.payment_method || "?"}`,
            `Estado: ${expense.review_status}`,
            `Confianza IA: ${expense.ai_confidence ? Math.round(expense.ai_confidence * 100) + "%" : "?"}`,
            expense.description ? `\nDescripción: ${expense.description}` : "",
          ]
            .filter(Boolean)
            .join("\n");
        } else {
          replyText = `No encontré el gasto #${expenseId}.`;
        }
      }
    }

    // Log the query
    await supabase.from("query_logs").insert({
      organization_id: org.id,
      requester_profile_id: profile?.id || null,
      channel: "whatsapp",
      question: message_text,
      answer: replyText,
    });

    return NextResponse.json({ ok: true, reply_text: replyText });
  } catch (error) {
    console.error("Query error:", error);
    return NextResponse.json(
      { ok: false, reply_text: "⚠️ Error al procesar la consulta." },
      { status: 500 }
    );
  }
}
