"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Pencil,
  CheckCircle2,
  XCircle,
  FileImage,
  Receipt,
  AlertTriangle,
  Download,
  Plus,
  Loader2,
  AlertCircle,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { formatCurrency, formatDate, getStatusInfo, getConfidenceInfo } from "@/lib/format";
import type { Expense, ReviewStatus, ExpenseCategory, UserProfile } from "@/lib/types";

const DEFAULT_PARTNER_COLOR = "#6b7280";

export default function GastosPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [partners, setPartners] = useState<UserProfile[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [partnerFilter, setPartnerFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Dialogs state
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editExpense, setEditExpense] = useState<Partial<Expense> | null>(null);
  const [showNew, setShowNew] = useState(false);

  async function loadData() {
    try {
      setLoading(true);

      // 1. Get current user profile for organization_id
      const { data: { user } } = await supabase.auth.getUser();
      let orgId = "";
      if (user) {
        const { data: profile } = await supabase
          .from("users_profile")
          .select("*")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        if (profile) {
          setCurrentUserProfile(profile);
          orgId = profile.organization_id;
        }
      }

      // 2. Load categories
      const { data: categoriesData } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });
      setCategories(categoriesData || []);

      // 3. Load partners
      const { data: partnersData } = await supabase
        .from("users_profile")
        .select("*")
        .order("full_name", { ascending: true });
      setPartners(partnersData || []);

      // 4. Load expenses
      const { data: expensesData, error } = await supabase
        .from("expenses")
        .select(`
          *,
          category:expense_categories(*),
          created_by:users_profile(*),
          files:expense_files(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExpenses((expensesData || []) as Expense[]);
    } catch (err) {
      console.error("Error loading expenses page data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [supabase]);

  // Quick action: update review status directly
  async function handleStatusUpdate(id: number, newStatus: ReviewStatus) {
    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          review_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // Reload
      loadData();
      if (selectedExpense?.id === id) {
        setSelectedExpense(prev => prev ? { ...prev, review_status: newStatus } : null);
      }
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Error al actualizar el estado del gasto");
    }
  }

  // Filter logic client-side
  const filteredExpenses = expenses.filter((exp) => {
    if (search) {
      const q = search.toLowerCase();
      const partnerName = exp.created_by
        ? `${exp.created_by.full_name} ${exp.created_by.last_name || ""}`.trim().toLowerCase()
        : exp.whatsapp_sender_name?.toLowerCase() || "";

      const matches =
        exp.supplier_name?.toLowerCase().includes(q) ||
        exp.description?.toLowerCase().includes(q) ||
        partnerName.includes(q) ||
        exp.id.toString().includes(q);

      if (!matches) return false;
    }

    if (statusFilter !== "all" && exp.review_status !== statusFilter) return false;
    if (categoryFilter !== "all" && exp.category_id !== categoryFilter) return false;
    if (partnerFilter !== "all" && exp.created_by_profile_id !== partnerFilter) return false;

    const expDateStr = exp.expense_date || exp.created_at;
    if (expDateStr) {
      const expDate = expDateStr.split("T")[0]; // YYYY-MM-DD
      if (dateFrom && expDate < dateFrom) return false;
      if (dateTo && expDate > dateTo) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gastos</h1>
          <p className="text-muted-foreground mt-1">
            {filteredExpenses.length} comprobantes encontrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gap-2 shadow-md shadow-primary/20 bg-primary hover:bg-primary/90"
            onClick={() => setShowNew(true)}
          >
            <Plus className="w-4 h-4" /> Nuevo gasto
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por proveedor, descripción, socio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
              <SelectTrigger className="w-full sm:w-44 h-10">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="reviewed">Revisado</SelectItem>
                <SelectItem value="corrected">Corregido</SelectItem>
                <SelectItem value="rejected">Rechazado</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              className={`h-10 w-10 shrink-0 ${showFilters ? "bg-accent text-accent-foreground border-accent-foreground/20" : ""}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/60 animate-fade-in">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Socio</Label>
                <Select value={partnerFilter} onValueChange={(val) => setPartnerFilter(val || "all")}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {partners.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name} {p.last_name || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Categoría</Label>
                <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || "all")}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Fecha desde</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Fecha hasta</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="h-[40vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Cargando comprobantes...</p>
          </div>
        </div>
      ) : (
        <Card className="shadow-sm overflow-hidden border border-border/60">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Socio</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="hidden md:table-cell">Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="hidden sm:table-cell">Pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden lg:table-cell">IA</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-32 text-center text-sm text-muted-foreground">
                      No se encontraron gastos con los filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((exp) => {
                    const status = getStatusInfo(exp.review_status || "pending");
                    const confidence = getConfidenceInfo(exp.ai_confidence ?? null);
                    
                    const partnerName = exp.created_by
                      ? `${exp.created_by.full_name} ${exp.created_by.last_name || ""}`.trim()
                      : exp.whatsapp_sender_name || "Desconocido";

                    const initials = exp.created_by?.full_name ? exp.created_by.full_name[0].toUpperCase() : (exp.whatsapp_sender_name?.[0] || "?");
                    const partnerColor = exp.created_by?.color || DEFAULT_PARTNER_COLOR;
                    const avatarStyle = { backgroundColor: `${partnerColor}15`, color: partnerColor };

                    return (
                      <TableRow
                        key={exp.id}
                        className="cursor-pointer group hover:bg-muted/40 transition-colors"
                        onClick={() => setSelectedExpense(exp)}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <span>{exp.id}</span>
                            {!!exp.files?.length && (
                              <FileImage className="h-3.5 w-3.5 text-primary" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDate(exp.expense_date || null)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 border border-border/10 shrink-0">
                              <AvatarFallback className="text-[10px] font-bold" style={avatarStyle}>
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium truncate max-w-[110px]">{partnerName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-semibold max-w-[130px] truncate">
                          {exp.supplier_name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs font-normal whitespace-nowrap bg-muted border-0">
                            {exp.category?.name || "Otros"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[180px] truncate">
                          {exp.description || "—"}
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm whitespace-nowrap">
                          {formatCurrency(exp.total_amount || 0, exp.currency)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground capitalize whitespace-nowrap">
                          {exp.payment_method?.replace("_", " ") || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1.5 text-xs py-0.5 border">
                            <div className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className={`text-xs font-semibold ${confidence.color}`}>
                            {exp.ai_confidence ? `${Math.round(exp.ai_confidence * 100)}%` : "—"}
                          </span>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger render={
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            } />
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => setSelectedExpense(exp)}>
                                <Eye className="mr-2 h-4 w-4" /> Ver detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditExpense(exp)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleStatusUpdate(exp.id, "reviewed")} className="text-emerald-500 focus:text-emerald-500">
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar revisado
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusUpdate(exp.id, "rejected")} className="text-destructive focus:text-destructive">
                                <XCircle className="mr-2 h-4 w-4" /> Rechazar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Detail Dialog */}
      <ExpenseDetailDialog
        expense={selectedExpense}
        onClose={() => setSelectedExpense(null)}
        onEdit={() => {
          setEditExpense(selectedExpense);
          setSelectedExpense(null);
        }}
        onStatusUpdate={handleStatusUpdate}
      />

      {/* Edit / New Dialog */}
      {(editExpense || showNew) && (
        <ExpenseEditDialog
          expense={editExpense}
          categories={categories}
          partners={partners}
          currentUserProfile={currentUserProfile}
          onClose={() => {
            setEditExpense(null);
            setShowNew(false);
          }}
          onSave={loadData}
        />
      )}
    </div>
  );
}

// ============================================================
// Expense Detail Dialog
// ============================================================

function ExpenseDetailDialog({
  expense,
  onClose,
  onEdit,
  onStatusUpdate,
}: {
  expense: Expense | null;
  onClose: () => void;
  onEdit: () => void;
  onStatusUpdate: (id: number, status: ReviewStatus) => Promise<void>;
}) {
  const [preview, setPreview] = useState<{ fileId: string; signedUrl: string } | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const primaryFile = expense?.files?.[0] || null;
  const isImageFile = primaryFile?.mime_type?.startsWith("image/");
  const previewUrl = preview && preview.fileId === primaryFile?.id ? preview.signedUrl : null;

  useEffect(() => {
    if (!expense?.id || !primaryFile || !isImageFile) {
      return;
    }

    const expenseId = expense.id;
    const fileId = primaryFile.id;
    let cancelled = false;

    async function loadPreview() {
      try {
        setFileLoading(true);
        const response = await fetch(`/api/expenses/${expenseId}/files/${fileId}/signed-url`);
        const data = await response.json();

        if (!cancelled && response.ok) {
          setPreview({ fileId, signedUrl: data.signedUrl });
        }
      } catch (error) {
        console.error("Error loading receipt preview:", error);
      } finally {
        if (!cancelled) {
          setFileLoading(false);
        }
      }
    }

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [expense?.id, primaryFile?.id, isImageFile]);

  async function openFile(fileId: string, download = false) {
    if (!expense?.id) return;

    try {
      const response = await fetch(
        `/api/expenses/${expense.id}/files/${fileId}/signed-url${download ? "?download=1" : ""}`
      );
      const data = await response.json();

      if (!response.ok || !data.signedUrl) {
        throw new Error(data.error || "No se pudo abrir el comprobante");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error opening receipt file:", error);
      alert("No se pudo abrir el comprobante");
    }
  }

  if (!expense) return null;
  const status = getStatusInfo(expense.review_status || "pending");
  const confidence = getConfidenceInfo(expense.ai_confidence ?? null);
  
  const partnerName = expense.created_by
    ? `${expense.created_by.full_name} ${expense.created_by.last_name || ""}`.trim()
    : expense.whatsapp_sender_name || "Desconocido";

  return (
    <Dialog open={!!expense} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <span>Gasto #{expense.id}</span>
              <Badge variant={status.variant} className="ml-3 gap-1.5 text-xs py-0.5 border">
                <div className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                {status.label}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            Detalles e información de validación del comprobante
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailField label="Proveedor" value={expense.supplier_name || "—"} />
            <DetailField label="Monto" value={formatCurrency(expense.total_amount || 0, expense.currency)} highlight />
            <DetailField label="Fecha del comprobante" value={formatDate(expense.expense_date || null)} />
            <DetailField label="Método de pago" value={expense.payment_method?.replace("_", " ") || "—"} />
            <DetailField label="Categoría" value={expense.category?.name || "Otros"} />
            <DetailField label="Rendido por" value={partnerName} />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs text-muted-foreground block">Comprobante adjunto</Label>
              {!!expense.files?.length && (
                <Badge variant="secondary" className="text-xs">
                  {expense.files.length} archivo{expense.files.length === 1 ? "" : "s"}
                </Badge>
              )}
            </div>

            {expense.files?.length ? (
              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                {primaryFile && isImageFile && (
                  <div className="overflow-hidden rounded-lg border border-border bg-background">
                    {fileLoading && !previewUrl ? (
                      <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando vista previa...
                      </div>
                    ) : previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt={primaryFile.original_filename || "Comprobante"}
                        className="max-h-96 w-full object-contain bg-white"
                      />
                    ) : null}
                  </div>
                )}

                <div className="space-y-2">
                  {expense.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {file.original_filename || `Comprobante ${file.id}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {file.mime_type || "Archivo"}{file.file_size_bytes ? ` - ${Math.round(file.file_size_bytes / 1024)} KB` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm" onClick={() => openFile(file.id)}>
                          <ExternalLink className="mr-1.5 h-4 w-4" />
                          Abrir
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openFile(file.id, true)}>
                          <Download className="mr-1.5 h-4 w-4" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                Este gasto no tiene comprobante adjunto.
              </div>
            )}
          </div>

          <Separator />

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Descripción del gasto</Label>
            <p className="text-sm font-medium">{expense.description || "Sin descripción"}</p>
          </div>

          <div className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-muted/40 border border-border/50">
            <div className={`flex items-center gap-2 ${confidence.color}`}>
              {expense.ai_confidence && expense.ai_confidence < 0.7 ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span className="text-sm font-semibold">
                Confianza IA: {expense.ai_confidence ? `${Math.round(expense.ai_confidence * 100)}%` : "—"}
              </span>
            </div>
            <Badge variant="outline" className="text-xs border-border bg-background">
              {confidence.label}
            </Badge>
          </div>

          {expense.notes && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Notas internas / Auditoría</Label>
              <p className="text-xs text-amber-600 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 font-medium">
                {expense.notes}
              </p>
            </div>
          )}

          {/* Quick validation footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/60">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-500 hover:text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/5"
                onClick={() => onStatusUpdate(expense.id, "reviewed")}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Aprobar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/5"
                onClick={() => onStatusUpdate(expense.id, "rejected")}
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Rechazar
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cerrar
              </Button>
              <Button size="sm" onClick={onEdit} className="gap-2">
                <Pencil className="w-4 h-4" /> Editar gasto
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailField({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-0.5 block">{label}</Label>
      <p className={`text-sm ${highlight ? "text-base font-bold text-primary" : "font-medium"}`}>{value}</p>
    </div>
  );
}

// ============================================================
// Expense Edit / New Dialog
// ============================================================

function ExpenseEditDialog({
  expense,
  categories,
  partners,
  currentUserProfile,
  onClose,
  onSave,
}: {
  expense: Partial<Expense> | null;
  categories: ExpenseCategory[];
  partners: UserProfile[];
  currentUserProfile: UserProfile | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [expenseDate, setExpenseDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("pending");
  const [createdById, setCreatedById] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (expense) {
      // Editing
      setExpenseDate(expense.expense_date || "");
      setTotalAmount(expense.total_amount?.toString() || "");
      setSupplierName(expense.supplier_name || "");
      setCategoryId(expense.category_id || "");
      setDescription(expense.description || "");
      setCurrency(expense.currency || "ARS");
      setPaymentMethod(expense.payment_method || "efectivo");
      setReviewStatus(expense.review_status || "pending");
      setCreatedById(expense.created_by_profile_id || "");
      setNotes(expense.notes || "");
    } else {
      // New Expense
      const today = new Date().toISOString().split("T")[0];
      setExpenseDate(today);
      setTotalAmount("");
      setSupplierName("");
      setCategoryId(categories[0]?.id || "");
      setDescription("");
      setCurrency("ARS");
      setPaymentMethod("efectivo");
      setReviewStatus("pending");
      setCreatedById(currentUserProfile?.id || "");
      setNotes("");
    }
  }, [expense, categories, partners, currentUserProfile]);

  async function handleSave() {
    if (!totalAmount || Number(totalAmount) <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }

    if (!currentUserProfile) {
      setError("No se pudo identificar tu organización");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        organization_id: currentUserProfile.organization_id,
        created_by_profile_id: createdById || null,
        category_id: categoryId || null,
        expense_date: expenseDate || null,
        supplier_name: supplierName.trim() || null,
        total_amount: Number(totalAmount),
        currency,
        payment_method: paymentMethod || null,
        description: description.trim() || null,
        review_status: reviewStatus,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (expense?.id) {
        // Update
        const { error } = await supabase
          .from("expenses")
          .update(payload)
          .eq("id", expense.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("expenses")
          .insert({
            ...payload,
            ai_status: "processed",
            ai_confidence: 1.0, // Manual receipts have 100% confidence
          });

        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (err: any) {
      console.error("Error saving expense:", err);
      setError(err.message || "Error al guardar el gasto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense?.id ? `Editar Gasto #${expense.id}` : "Nuevo Gasto Manual"}</DialogTitle>
          <DialogDescription>
            {expense?.id
              ? "Actualizá la información del comprobante"
              : "Registrá un gasto directamente en el sistema"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Fecha del gasto</Label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="mt-1 h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Monto total *</Label>
              <Input
                type="number"
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="mt-1 h-9"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Moneda</Label>
              <Select value={currency} onValueChange={(val) => setCurrency(val || "ARS")}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Método de pago</Label>
              <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val || "efectivo")}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="debito">Débito</SelectItem>
                  <SelectItem value="credito">Crédito</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="mercado_pago">Mercado Pago</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Proveedor</Label>
            <Input
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="mt-1 h-9"
              placeholder="Ej: Easy, Carrefour"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Categoría</Label>
              <Select value={categoryId} onValueChange={(val) => setCategoryId(val || "")}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder="Otros" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                  <SelectItem value="">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Socio Responsable</Label>
              <Select value={createdById} onValueChange={(val) => setCreatedById(val || "")}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder="Seleccionar socio" />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name} {p.last_name || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={2}
              placeholder="Detalles sobre lo que se compró..."
            />
          </div>

          <div>
            <Label className="text-xs">Estado de revisión</Label>
            <Select value={reviewStatus} onValueChange={(val) => setReviewStatus((val as ReviewStatus) || "pending")}>
              <SelectTrigger className="mt-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="reviewed">Revisado</SelectItem>
                <SelectItem value="corrected">Corregido</SelectItem>
                <SelectItem value="rejected">Rechazado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Notas internas / Observaciones</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={2}
              placeholder="Notas de auditoría o correcciones..."
            />
          </div>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" disabled={loading} onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={handleSave}
              className="shadow-md shadow-primary/20 bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
