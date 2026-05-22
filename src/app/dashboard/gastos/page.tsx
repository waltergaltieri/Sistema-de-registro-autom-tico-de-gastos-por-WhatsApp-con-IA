"use client";

import { useState } from "react";
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
  ArrowUpDown,
  Download,
  Plus,
  X,
} from "lucide-react";
import { formatCurrency, formatDate, getStatusInfo, getConfidenceInfo } from "@/lib/format";
import type { Expense, ReviewStatus } from "@/lib/types";

// ============================================================
// Demo expenses
// ============================================================

const demoExpenses: Partial<Expense>[] = [
  {
    id: 1, expense_date: "2026-05-21", created_at: "2026-05-21T18:30:00Z",
    supplier_name: "Easy", description: "Compra de pintura y materiales",
    total_amount: 48500, currency: "ARS", payment_method: "debito",
    review_status: "pending", ai_confidence: 0.92,
    whatsapp_sender_name: "Walter",
    category: { id: "1", organization_id: "", name: "Materiales", is_active: true, created_at: "", description: null },
  },
  {
    id: 2, expense_date: "2026-05-20", created_at: "2026-05-20T14:20:00Z",
    supplier_name: "Flete Rápido", description: "Flete materiales obra",
    total_amount: 22000, currency: "ARS", payment_method: "efectivo",
    review_status: "reviewed", ai_confidence: 0.88,
    whatsapp_sender_name: "Ana",
    category: { id: "2", organization_id: "", name: "Transporte / envíos", is_active: true, created_at: "", description: null },
  },
  {
    id: 3, expense_date: "2026-05-19", created_at: "2026-05-19T10:45:00Z",
    supplier_name: "Pinturería Central", description: "Pintura y rodillos para local",
    total_amount: 90000, currency: "ARS", payment_method: "transferencia",
    review_status: "corrected", ai_confidence: 0.65,
    whatsapp_sender_name: "Lucía",
    category: { id: "3", organization_id: "", name: "Obra / remodelación", is_active: true, created_at: "", description: null },
  },
  {
    id: 4, expense_date: "2026-05-18", created_at: "2026-05-18T09:00:00Z",
    supplier_name: "Inmobiliaria Sur", description: "Seña del local comercial",
    total_amount: 500000, currency: "ARS", payment_method: "transferencia",
    review_status: "reviewed", ai_confidence: 0.95,
    whatsapp_sender_name: "Marlon",
    category: { id: "4", organization_id: "", name: "Alquiler / seña", is_active: true, created_at: "", description: null },
  },
  {
    id: 5, expense_date: "2026-05-17", created_at: "2026-05-17T16:30:00Z",
    supplier_name: "Starbucks", description: "Café reunión de socios",
    total_amount: 12300, currency: "ARS", payment_method: "debito",
    review_status: "pending", ai_confidence: 0.78,
    whatsapp_sender_name: "Walter",
    category: { id: "5", organization_id: "", name: "Comida / reuniones", is_active: true, created_at: "", description: null },
  },
  {
    id: 6, expense_date: "2026-05-16", created_at: "2026-05-16T11:00:00Z",
    supplier_name: "MercadoLibre", description: "Cajas organizadoras",
    total_amount: 35000, currency: "ARS", payment_method: "mercado_pago",
    review_status: "rejected", ai_confidence: 0.42,
    whatsapp_sender_name: "Ana",
    category: { id: "6", organization_id: "", name: "Mobiliario", is_active: true, created_at: "", description: null },
  },
  {
    id: 7, expense_date: "2026-05-15", created_at: "2026-05-15T08:20:00Z",
    supplier_name: "Diseñador Gráfico", description: "Logo y branding negocio",
    total_amount: 120000, currency: "ARS", payment_method: "transferencia",
    review_status: "reviewed", ai_confidence: 0.91,
    whatsapp_sender_name: "Lucía",
    category: { id: "7", organization_id: "", name: "Diseño / branding", is_active: true, created_at: "", description: null },
  },
];

const categories = [
  "Alquiler / seña", "Obra / remodelación", "Materiales", "Mobiliario",
  "Marketing", "Diseño / branding", "Transporte / envíos", "Comida / reuniones",
  "Servicios", "Tecnología", "Otros",
];

const partners = ["Walter", "Marlon", "Ana", "Lucía"];

export default function GastosPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Partial<Expense> | null>(null);
  const [editExpense, setEditExpense] = useState<Partial<Expense> | null>(null);

  const filteredExpenses = demoExpenses.filter((exp) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        exp.supplier_name?.toLowerCase().includes(q) ||
        exp.description?.toLowerCase().includes(q) ||
        exp.whatsapp_sender_name?.toLowerCase().includes(q) ||
        exp.id?.toString().includes(q);
      if (!matches) return false;
    }
    if (statusFilter !== "all" && exp.review_status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gastos</h1>
          <p className="text-muted-foreground mt-1">
            {filteredExpenses.length} registros encontrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </Button>
          <Button size="sm" className="gap-2 shadow-md shadow-primary/20">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo gasto</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
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
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
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
              className="h-10 w-10 shrink-0"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t animate-fade-in">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Fecha desde</Label>
                <Input type="date" className="h-9" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Fecha hasta</Label>
                <Input type="date" className="h-9" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Categoría</Label>
                <Select>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm overflow-hidden">
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
              {filteredExpenses.map((exp) => {
                const status = getStatusInfo(exp.review_status || "pending");
                const confidence = getConfidenceInfo(exp.ai_confidence ?? null);
                return (
                  <TableRow
                    key={exp.id}
                    className="cursor-pointer group"
                    onClick={() => setSelectedExpense(exp)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {exp.id}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDate(exp.expense_date || null)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                          {exp.whatsapp_sender_name?.[0]}
                        </div>
                        <span className="text-sm">{exp.whatsapp_sender_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium max-w-[150px] truncate">
                      {exp.supplier_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs font-normal whitespace-nowrap">
                        {exp.category?.name || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                      {exp.description}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm whitespace-nowrap">
                      {formatCurrency(exp.total_amount || 0, exp.currency)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground capitalize whitespace-nowrap">
                      {exp.payment_method?.replace("_", " ") || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="gap-1.5 text-xs">
                        <div className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className={`text-xs font-medium ${confidence.color}`}>
                        {exp.ai_confidence ? `${Math.round(exp.ai_confidence * 100)}%` : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedExpense(exp); }}>
                            <Eye className="mr-2 h-4 w-4" /> Ver detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditExpense(exp); }}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <CheckCircle2 className="mr-2 h-4 w-4 text-success" /> Marcar revisado
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="text-destructive focus:text-destructive">
                            <XCircle className="mr-2 h-4 w-4" /> Rechazar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <FileImage className="mr-2 h-4 w-4" /> Ver comprobante
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Detail Dialog */}
      <ExpenseDetailDialog
        expense={selectedExpense}
        onClose={() => setSelectedExpense(null)}
        onEdit={() => {
          setEditExpense(selectedExpense);
          setSelectedExpense(null);
        }}
      />

      {/* Edit Dialog */}
      <ExpenseEditDialog
        expense={editExpense}
        onClose={() => setEditExpense(null)}
      />
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
}: {
  expense: Partial<Expense> | null;
  onClose: () => void;
  onEdit: () => void;
}) {
  if (!expense) return null;
  const status = getStatusInfo(expense.review_status || "pending");
  const confidence = getConfidenceInfo(expense.ai_confidence ?? null);

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
              <Badge variant={status.variant} className="ml-3 gap-1.5 text-xs">
                <div className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                {status.label}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            Detalle completo del gasto registrado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Main data */}
          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Proveedor" value={expense.supplier_name || "—"} />
            <DetailField label="Monto" value={formatCurrency(expense.total_amount || 0, expense.currency)} highlight />
            <DetailField label="Fecha del gasto" value={formatDate(expense.expense_date || null)} />
            <DetailField label="Método de pago" value={expense.payment_method?.replace("_", " ") || "—"} />
            <DetailField label="Categoría" value={expense.category?.name || "—"} />
            <DetailField label="Socio" value={expense.whatsapp_sender_name || "—"} />
          </div>

          <Separator />

          {/* Description */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Descripción</Label>
            <p className="text-sm">{expense.description || "Sin descripción"}</p>
          </div>

          {/* AI Confidence */}
          <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/50">
            <div className={`flex items-center gap-2 ${confidence.color}`}>
              {expense.ai_confidence && expense.ai_confidence < 0.7 ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                Confianza IA: {expense.ai_confidence ? `${Math.round(expense.ai_confidence * 100)}%` : "—"}
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {confidence.label}
            </Badge>
          </div>

          {/* Comprobante placeholder */}
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
            <FileImage className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Comprobante original
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Se mostrará cuando Supabase Storage esté configurado
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button onClick={onEdit} className="gap-2">
              <Pencil className="w-4 h-4" /> Editar
            </Button>
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
      <p className={`text-sm ${highlight ? "text-lg font-bold" : "font-medium"}`}>{value}</p>
    </div>
  );
}

// ============================================================
// Expense Edit Dialog
// ============================================================

function ExpenseEditDialog({
  expense,
  onClose,
}: {
  expense: Partial<Expense> | null;
  onClose: () => void;
}) {
  if (!expense) return null;

  return (
    <Dialog open={!!expense} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Gasto #{expense.id}</DialogTitle>
          <DialogDescription>
            Corregí los datos del gasto. Los cambios quedan registrados en auditoría.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Fecha del gasto</Label>
              <Input type="date" defaultValue={expense.expense_date || ""} className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs">Monto total</Label>
              <Input type="number" step="0.01" defaultValue={expense.total_amount || 0} className="mt-1 h-9" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Proveedor</Label>
            <Input defaultValue={expense.supplier_name || ""} className="mt-1 h-9" />
          </div>

          <div>
            <Label className="text-xs">Categoría</Label>
            <Select defaultValue={expense.category?.name}>
              <SelectTrigger className="mt-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Descripción</Label>
            <Textarea defaultValue={expense.description || ""} className="mt-1" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Moneda</Label>
              <Select defaultValue={expense.currency || "ARS"}>
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
              <Select defaultValue={expense.payment_method || ""}>
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
            <Label className="text-xs">Estado de revisión</Label>
            <Select defaultValue={expense.review_status || "pending"}>
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
            <Label className="text-xs">Notas internas</Label>
            <Textarea defaultValue={expense.notes || ""} className="mt-1" rows={2} placeholder="Notas adicionales..." />
          </div>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button className="shadow-md shadow-primary/20" onClick={onClose}>
              Guardar cambios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
