"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tags, Plus, Pencil, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface CategoryItem {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  total_spent: number;
  expense_count: number;
}

const demoCategories: CategoryItem[] = [
  { id: "1", name: "Alquiler / seña", description: "Pagos de alquiler, señas, depósitos", is_active: true, total_spent: 500000, expense_count: 2 },
  { id: "2", name: "Obra / remodelación", description: "Trabajos de construcción y remodelación", is_active: true, total_spent: 320000, expense_count: 5 },
  { id: "3", name: "Materiales", description: "Materiales de construcción y obra", is_active: true, total_spent: 180000, expense_count: 4 },
  { id: "4", name: "Mobiliario", description: "Muebles y equipamiento del local", is_active: true, total_spent: 35000, expense_count: 1 },
  { id: "5", name: "Equipamiento", description: "Equipos, herramientas, maquinaria", is_active: true, total_spent: 0, expense_count: 0 },
  { id: "6", name: "Mercadería inicial", description: "Stock inicial para el negocio", is_active: true, total_spent: 0, expense_count: 0 },
  { id: "7", name: "Marketing", description: "Publicidad, redes sociales, campañas", is_active: true, total_spent: 75000, expense_count: 3 },
  { id: "8", name: "Diseño / branding", description: "Logo, diseño gráfico, cartelería", is_active: true, total_spent: 120000, expense_count: 1 },
  { id: "9", name: "Trámites / legales", description: "Habilitaciones, permisos, honorarios", is_active: true, total_spent: 0, expense_count: 0 },
  { id: "10", name: "Servicios", description: "Luz, gas, agua, internet, hosting", is_active: true, total_spent: 0, expense_count: 0 },
  { id: "11", name: "Limpieza", description: "Productos y servicios de limpieza", is_active: false, total_spent: 0, expense_count: 0 },
  { id: "12", name: "Tecnología", description: "Software, hardware, suscripciones tech", is_active: true, total_spent: 0, expense_count: 0 },
  { id: "13", name: "Transporte / envíos", description: "Fletes, envíos, combustible", is_active: true, total_spent: 55000, expense_count: 2 },
  { id: "14", name: "Comida / reuniones", description: "Café, almuerzos de trabajo, catering", is_active: true, total_spent: 12300, expense_count: 1 },
  { id: "15", name: "Otros", description: "Gastos que no entran en otra categoría", is_active: true, total_spent: 0, expense_count: 0 },
];

export default function CategoriasPage() {
  const [editCategory, setEditCategory] = useState<CategoryItem | null>(null);
  const [showNew, setShowNew] = useState(false);

  const totalCategories = demoCategories.length;
  const activeCategories = demoCategories.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Categorías</h1>
          <p className="text-muted-foreground mt-1">
            {activeCategories} activas de {totalCategories} categorías
          </p>
        </div>
        <Button size="sm" className="gap-2 shadow-md shadow-primary/20" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4" /> Nueva categoría
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
        {demoCategories.map((cat) => (
          <Card
            key={cat.id}
            className={`shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer ${
              !cat.is_active ? "opacity-50" : ""
            }`}
            onClick={() => setEditCategory(cat)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                    <Tags className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{cat.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {cat.description || "Sin descripción"}
                    </p>
                  </div>
                </div>
                {!cat.is_active && (
                  <Badge variant="secondary" className="text-[10px]">Inactiva</Badge>
                )}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span className="font-medium text-foreground">{formatCurrency(cat.total_spent)}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {cat.expense_count} gasto{cat.expense_count !== 1 ? "s" : ""}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editCategory || showNew} onOpenChange={() => { setEditCategory(null); setShowNew(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editCategory ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
            <DialogDescription>
              {editCategory ? "Modificá los datos de la categoría" : "Creá una nueva categoría de gastos"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Nombre</Label>
              <Input defaultValue={editCategory?.name || ""} className="mt-1 h-9" placeholder="Nombre de la categoría" />
            </div>
            <div>
              <Label className="text-xs">Descripción</Label>
              <Textarea defaultValue={editCategory?.description || ""} className="mt-1" rows={2} placeholder="Descripción opcional..." />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Activa</Label>
                <p className="text-xs text-muted-foreground">Si está desactivada, no aparece en la IA</p>
              </div>
              <Switch defaultChecked={editCategory?.is_active ?? true} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setEditCategory(null); setShowNew(false); }}>
                Cancelar
              </Button>
              <Button className="shadow-md shadow-primary/20" onClick={() => { setEditCategory(null); setShowNew(false); }}>
                {editCategory ? "Guardar" : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
