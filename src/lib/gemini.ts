import type { GeminiExpenseResponse } from "@/lib/types";

interface ProcessExpenseInput {
  imageBase64: string;
  mimeType: string;
  messageText: string;
  senderName: string;
  sentAt: string;
  categories: string[];
}

export interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  thoughtsTokenCount?: number;
  [key: string]: unknown;
}

export interface GeminiCostEstimate {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCostPer1MUsd: number;
  outputCostPer1MUsd: number;
  estimatedCostUsd: number;
}

export interface ProcessExpenseWithGeminiResult {
  expense: GeminiExpenseResponse;
  model: string;
  usageMetadata: GeminiUsageMetadata | null;
  cost: GeminiCostEstimate;
  latencyMs: number;
}

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_FLASH_LITE_INPUT_COST_PER_1M_USD = 0.1;
const GEMINI_FLASH_LITE_OUTPUT_COST_PER_1M_USD = 0.4;
const GEMINI_FLASH_INPUT_COST_PER_1M_USD = 0.3;
const GEMINI_FLASH_OUTPUT_COST_PER_1M_USD = 2.5;

export function getGeminiModelCandidates(configuredModel: string | undefined) {
  return Array.from(
    new Set([configuredModel?.trim() || DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_MODEL])
  );
}

/**
 * Process an expense receipt image using Google Gemini Vision API.
 * Returns structured expense data extracted from the image.
 */
export async function processExpenseWithGemini(
  input: ProcessExpenseInput
): Promise<ProcessExpenseWithGeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const systemPrompt = buildSystemPrompt(input.categories);
  const userPrompt = buildUserPrompt(input);
  const models = getGeminiModelCandidates(process.env.GEMINI_MODEL);
  let lastError: Error | null = null;

  for (const model of models) {
    const startedAt = Date.now();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt + "\n\n" + userPrompt },
                {
                  inlineData: {
                    mimeType: input.mimeType,
                    data: input.imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: getResponseSchema(),
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error (${model}):`, errorText);
      lastError = new Error(`Gemini API error (${model}): ${response.status}`);
      continue;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      lastError = new Error(`No response from Gemini (${model})`);
      continue;
    }

    const parsed: GeminiExpenseResponse = JSON.parse(text);
    const usageMetadata = isRecord(data.usageMetadata)
      ? (data.usageMetadata as GeminiUsageMetadata)
      : null;

    // Validate and normalize
    return {
      expense: normalizeGeminiResponse(parsed),
      model,
      usageMetadata,
      cost: estimateGeminiCost(model, usageMetadata),
      latencyMs: Date.now() - startedAt,
    };
  }

  throw lastError || new Error("Gemini API error");
}

export function estimateGeminiCost(
  model: string,
  usageMetadata: GeminiUsageMetadata | null | undefined
): GeminiCostEstimate {
  const inputTokens = positiveInteger(usageMetadata?.promptTokenCount);
  const outputTokens = positiveInteger(usageMetadata?.candidatesTokenCount);
  const totalTokens = positiveInteger(usageMetadata?.totalTokenCount) || inputTokens + outputTokens;
  const pricing = getGeminiPricing(model);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    inputCostPer1MUsd: pricing.input,
    outputCostPer1MUsd: pricing.output,
    estimatedCostUsd:
      (inputTokens / 1_000_000) * pricing.input +
      (outputTokens / 1_000_000) * pricing.output,
  };
}

function getGeminiPricing(model: string) {
  if (model.includes("flash-lite")) {
    return {
      input: GEMINI_FLASH_LITE_INPUT_COST_PER_1M_USD,
      output: GEMINI_FLASH_LITE_OUTPUT_COST_PER_1M_USD,
    };
  }

  if (model.includes("flash")) {
    return {
      input: GEMINI_FLASH_INPUT_COST_PER_1M_USD,
      output: GEMINI_FLASH_OUTPUT_COST_PER_1M_USD,
    };
  }

  return {
    input: GEMINI_FLASH_LITE_INPUT_COST_PER_1M_USD,
    output: GEMINI_FLASH_LITE_OUTPUT_COST_PER_1M_USD,
  };
}

function positiveInteger(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildSystemPrompt(categories: string[]): string {
  const categoryList = categories.map((c) => `- ${c}`).join("\n");

  return `Sos un asistente especializado en interpretar comprobantes, presupuestos, facturas, tickets y recibos de gastos de un negocio en Argentina.

Tu tarea es extraer datos estructurados de una imagen o documento enviado por WhatsApp. Debés combinar la información visual del comprobante con el texto adicional enviado por el usuario.

No inventes datos. Si un campo no aparece o no se puede inferir con seguridad, devolvelo como null y agregalo a doubtful_fields.

REGLAS:
- El remitente real del gasto lo define el sistema, no el comprobante.
- La fecha del comprobante tiene prioridad sobre la fecha del mensaje.
- Si no hay fecha visible en el comprobante, usar la fecha del mensaje como fallback y marcarlo como dudoso.
- El monto total debe ser el importe final pagado o presupuestado.
- Si hay varios montos, elegir el total final y marcar duda si no es claro.
- Si el documento parece presupuesto y no gasto confirmado, marcar receipt_type como "presupuesto".
- Clasificar usando SOLO estas categorías:
${categoryList}
- Devolver JSON válido, sin markdown ni comentarios.`;
}

function buildUserPrompt(input: ProcessExpenseInput): string {
  return `Analizá esta imagen de comprobante/ticket/factura.

Información del mensaje de WhatsApp:
- Remitente: ${input.senderName}
- Fecha/hora del mensaje: ${input.sentAt}
- Texto del usuario: ${input.messageText || "(sin texto adicional)"}

Extraé todos los datos que puedas del comprobante.`;
}

export function getResponseSchema() {
  return {
    type: "OBJECT",
    properties: {
      expense_date: { type: "STRING", nullable: true },
      supplier_name: { type: "STRING", nullable: true },
      supplier_tax_id: { type: "STRING", nullable: true },
      receipt_type: { type: "STRING", nullable: true },
      receipt_number: { type: "STRING", nullable: true },
      description: { type: "STRING" },
      total_amount: { type: "NUMBER", nullable: true },
      currency: { type: "STRING", nullable: true },
      payment_method: { type: "STRING", nullable: true },
      suggested_category_name: { type: "STRING", nullable: true },
      items: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            quantity: { type: "NUMBER" },
            unit_price: { type: "NUMBER" },
            total: { type: "NUMBER" },
          },
          required: ["name", "quantity", "unit_price", "total"],
        },
      },
      confidence: { type: "NUMBER" },
      doubtful_fields: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            field: { type: "STRING" },
            reason: { type: "STRING" },
          },
          required: ["field", "reason"],
        },
      },
      short_human_summary: { type: "STRING" },
    },
    required: ["description", "total_amount", "confidence", "short_human_summary"],
  };
}

export function normalizeGeminiResponse(
  raw: GeminiExpenseResponse
): GeminiExpenseResponse {
  return {
    ...raw,
    // Normalize amount
    total_amount: typeof raw.total_amount === "number" ? Math.abs(raw.total_amount) : null,
    // Normalize confidence
    confidence:
      typeof raw.confidence === "number"
        ? Math.max(0, Math.min(1, raw.confidence))
        : 0,
    // Normalize currency
    currency: raw.currency?.toUpperCase() === "USD" ? "USD" : "ARS",
    // Normalize arrays
    items: Array.isArray(raw.items) ? raw.items : [],
    doubtful_fields: Array.isArray(raw.doubtful_fields) ? raw.doubtful_fields : [],
  };
}
