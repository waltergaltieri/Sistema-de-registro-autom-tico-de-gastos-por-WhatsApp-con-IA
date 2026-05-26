// ==========================================
// Database Types for Gastos Socios
// ==========================================

export interface Organization {
  id: string;
  name: string;
  whatsapp_group_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  auth_user_id: string | null;
  organization_id: string;
  full_name: string;
  last_name: string | null;
  email: string | null;
  whatsapp_phone: string;
  role: "super_admin" | "admin" | "partner" | "readonly";
  is_active: boolean;
  color: string | null;
  dni: string | null;
  cuil: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export type ReviewStatus = "pending" | "reviewed" | "corrected" | "rejected";
export type AIStatus = "queued" | "processing" | "processed" | "failed" | "needs_review";

export interface Expense {
  id: number;
  organization_id: string;
  created_by_profile_id: string | null;
  category_id: string | null;

  // WhatsApp metadata
  whatsapp_message_id: string | null;
  whatsapp_chat_id: string | null;
  whatsapp_sender_phone: string | null;
  whatsapp_sender_name: string | null;
  message_text: string | null;
  message_sent_at: string | null;

  // Expense data
  expense_date: string | null;
  supplier_name: string | null;
  supplier_tax_id: string | null;
  receipt_type: string | null;
  receipt_number: string | null;
  description: string | null;
  total_amount: number | null;
  currency: string;
  payment_method: string | null;

  // AI data
  ai_confidence: number | null;
  ai_status: AIStatus;
  review_status: ReviewStatus;
  raw_ai_response: Record<string, unknown> | null;
  extracted_items: ExtractedItem[] | null;
  doubtful_fields: DoubtfulField[] | null;

  notes: string | null;
  created_at: string;
  updated_at: string;

  // Joined fields (optional)
  category?: ExpenseCategory;
  created_by?: UserProfile;
  files?: ExpenseFile[];
}

export interface ExtractedItem {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface DoubtfulField {
  field: string;
  reason: string;
}

export interface ExpenseFile {
  id: string;
  organization_id: string;
  expense_id: number;
  storage_bucket: string;
  storage_path: string;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  file_sha256: string | null;
  created_at: string;
}

export interface ExpenseAuditLog {
  id: string;
  organization_id: string;
  expense_id: number;
  actor_profile_id: string | null;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  actor?: UserProfile;
}

export interface BotMessageLog {
  id: string;
  organization_id: string | null;
  whatsapp_message_id: string | null;
  whatsapp_chat_id: string | null;
  sender_phone: string | null;
  sender_name: string | null;
  message_type: string | null;
  message_text: string | null;
  has_media: boolean;
  processing_status: string;
  error_message: string | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
}

export interface QueryLog {
  id: string;
  organization_id: string;
  requester_profile_id: string | null;
  channel: string;
  question: string;
  generated_sql: string | null;
  answer: string | null;
  created_at: string;
}

export interface AIUsageLog {
  id: string;
  organization_id: string;
  expense_id: number | null;
  provider: string;
  model: string;
  operation: string;
  status: "success" | "failed";
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  input_cost_per_1m_usd: number;
  output_cost_per_1m_usd: number;
  estimated_cost_usd: number;
  latency_ms: number | null;
  error_message: string | null;
  raw_usage: Record<string, unknown> | null;
  created_at: string;
}

// ==========================================
// API Types
// ==========================================

export interface GeminiExpenseResponse {
  expense_date: string | null;
  supplier_name: string | null;
  supplier_tax_id: string | null;
  receipt_type: string | null;
  receipt_number: string | null;
  description: string;
  total_amount: number | null;
  currency: string | null;
  payment_method: string | null;
  suggested_category_name: string | null;
  items: ExtractedItem[];
  confidence: number;
  doubtful_fields: DoubtfulField[];
  short_human_summary: string;
}

export interface IncomingMessagePayload {
  message_id: string;
  chat_id: string;
  sender_phone: string;
  sender_name: string;
  message_text: string;
  sent_at: string;
  has_media: boolean;
  media?: {
    mime_type: string;
    filename: string;
    base64: string;
  };
}

// ==========================================
// Dashboard Filter Types
// ==========================================

export interface ExpenseFilters {
  dateFrom?: string;
  dateTo?: string;
  partnerId?: string;
  categoryId?: string;
  status?: ReviewStatus;
  supplier?: string;
  search?: string;
}
