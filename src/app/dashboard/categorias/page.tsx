"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tags, Plus, Loader2, AlertCircle, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface CategoryItem {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at?: string;
  total_spent?: number;
  expense_count?: number;
}

export default function CategoriasPage() {
  const supabase = createClient();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Dialog & Form states
  const [editCategory, setEditCategory] = useState<CategoryItem | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formActive, setFormActive] = useState(true);

  // Load User Profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from("users_profile")
            .select("*")
            .eq("auth_user_id", user.id)
            .maybeSingle();

          if (profileError) throw profileError;
          setUserProfile(profile);
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
        setError("Error al cargar perfil de usuario.");
      }
    }
    loadProfile();
  }, [supabase]);

  // Fetch categories when profile is loaded
  const fetchCategories = async () => {
    if (!userProfile?.organization_id) return;
    try {
      setLoading(true);
      const { data, error: catError } = await supabase
        .from("expense_categories")
        .select(`
          *,
          expenses (
            total_amount
          )
        `)
        .eq("organization_id", userProfile.organization_id)
        .order("name", { ascending: true });

      if (catError) throw catError;

      const categoriesWithTotals = (data || []).map((cat: any) => {
        const expenses = cat.expenses || [];
        const total_spent = expenses.reduce((sum: number, exp: any) => sum + Number(exp.total_amount || 0), 0);
        const expense_count = expenses.length;
        return {
          id: cat.id,
          name: cat.name,
          description: cat.description,
          is_active: cat.is_active,
          created_at: cat.created_at,
          total_spent,
          expense_count,
        };
      });

      setCategories(categoriesWithTotals);
      setError(null);
    } catch (err) {
      console.error("Error loading categories:", err);
      setError("No se pudieron cargar las categorías.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchCategories();
    }
  }, [userProfile]);

  // Open create modal
  const handleOpenCreate = () => {
    setEditCategory(null);
    setFormName("");
    setFormDesc("");
    setFormActive(true);
    setModalError(null);
    setShowNew(true);
  };

  // Open edit modal
  const handleOpenEdit = (cat: CategoryItem) => {
    setEditCategory(cat);
    setFormName(cat.name);
    setFormDesc(cat.description || "");
    setFormActive(cat.is_active);
    setModalError(null);
    setShowNew(false);
  };

  // Create or Update Category Handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setModalError("El nombre es obligatorio.");
      return;
    }

    if (!userProfile?.organization_id) {
      setModalError("No se encontró la organización del usuario.");
      return;
    }

    try {
      setActionLoading(true);
      setModalError(null);

      if (editCategory) {
        // Update
        const { error: updateError } = await supabase
          .from("expense_categories")
          .update({
            name: formName.trim(),
            description: formDesc.trim() || null,
            is_active: formActive,
          })
          .eq("id", editCategory.id);

        if (updateError) {
          if (updateError.code === "23505") {
            throw new Error("Ya existe una categoría con este nombre en tu organización.");
          }
          throw updateError;
        }
      } else {
        // Create
        const { error: createError } = await supabase
          .from("expense_categories")
          .insert({
            organization_id: userProfile.organization_id,
            name: formName.trim(),
            description: formDesc.trim() || null,
            is_active: formActive,
          });

        if (createError) {
          if (createError.code === "23505") {
            throw new Error("Ya existe una categoría con este nombre en tu organización.");
          }
          throw createError;
        }
      }

      // Close modal and refresh list
      setEditCategory(null);
      setShowNew(false);
      await fetchCategories();
    } catch (err: any) {
      console.error("Error saving category:", err);
      setModalError(err.message || "Ocurrió un error al guardar.");
    } finally {
      setActionLoading(false);
    }
  };

  const totalCategories = categories.length;
  const activeCategories = categories.filter((c) => c.is_active).length;

  if (loading && categories.length === 0) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando categorías...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Categorías</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {activeCategories} activas de {totalCategories} categorías
          </p>
        </div>
        <Button size="sm" className="gap-2 shadow-md shadow-primary/20" onClick={handleOpenCreate}>
          <Plus className="w-4 h-4" /> Nueva categoría
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Grid */}
      {categories.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-2xl">
          <Tags className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
          <p className="font-medium text-sm text-muted-foreground">No hay categorías creadas todavía.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={handleOpenCreate}>
            Crear la primera
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Card
              key={cat.id}
              className={`shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer border border-border/60 hover:border-border ${
                !cat.is_active ? "opacity-60 bg-muted/30" : ""
              }`}
              onClick={() => handleOpenEdit(cat)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform shrink-0 mt-0.5">
                      <Tags className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{cat.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 pr-1">
                        {cat.description || "Sin descripción"}
                      </p>
                    </div>
                  </div>
                  {!cat.is_active && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">Inactiva</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground/75" />
                    <span className="font-medium text-foreground">{formatCurrency(cat.total_spent ?? 0)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {cat.expense_count ?? 0} gasto{(cat.expense_count ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={!!editCategory || showNew} onOpenChange={() => { setEditCategory(null); setShowNew(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editCategory ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
            <DialogDescription>
              {editCategory ? "Modificá los datos de la categoría" : "Creá una nueva categoría de gastos para tu organización"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="cat-name" className="text-xs">Nombre</Label>
              <Input
                id="cat-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="mt-1 h-9"
                placeholder="Nombre de la categoría (ej: Materiales)"
                disabled={actionLoading}
                required
              />
            </div>
            <div>
              <Label htmlFor="cat-desc" className="text-xs">Descripción</Label>
              <Textarea
                id="cat-desc"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="mt-1"
                rows={3}
                placeholder="Descripción opcional sobre el uso de la categoría..."
                disabled={actionLoading}
              />
            </div>
            <div className="flex items-center justify-between py-2 border-t border-b border-border/40">
              <div>
                <Label htmlFor="cat-active" className="text-sm cursor-pointer">Activa</Label>
                <p className="text-xs text-muted-foreground">Si está desactivada, el bot con IA no la sugerirá</p>
              </div>
              <Switch
                id="cat-active"
                checked={formActive}
                onCheckedChange={setFormActive}
                disabled={actionLoading}
              />
            </div>

            {modalError && (
              <div className="bg-destructive/10 text-destructive text-xs rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setEditCategory(null); setShowNew(false); }}
                disabled={actionLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" className="shadow-md shadow-primary/20" disabled={actionLoading}>
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editCategory ? "Guardar" : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
