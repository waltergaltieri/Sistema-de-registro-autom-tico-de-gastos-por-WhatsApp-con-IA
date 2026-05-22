"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Users, Plus, Pencil, Phone, Mail, Shield, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface PartnerItem {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp_phone: string;
  role: "admin" | "partner" | "readonly";
  is_active: boolean;
  total_spent: number;
}

const demoPartners: PartnerItem[] = [
  { id: "1", full_name: "Walter", email: "walter@email.com", whatsapp_phone: "+5491112345678", role: "admin", is_active: true, total_spent: 420000 },
  { id: "2", full_name: "Marlon", email: "marlon@email.com", whatsapp_phone: "+5491187654321", role: "partner", is_active: true, total_spent: 310000 },
  { id: "3", full_name: "Ana", email: "ana@email.com", whatsapp_phone: "+5491155556666", role: "partner", is_active: true, total_spent: 280000 },
  { id: "4", full_name: "Lucía", email: "lucia@email.com", whatsapp_phone: "+5491144443333", role: "partner", is_active: true, total_spent: 235000 },
];

const roleLabels = {
  admin: { label: "Admin", color: "bg-primary text-primary-foreground" },
  partner: { label: "Socio", color: "bg-chart-2/10 text-chart-2" },
  readonly: { label: "Solo lectura", color: "bg-muted text-muted-foreground" },
};

const avatarColors = [
  "bg-chart-1/15 text-chart-1",
  "bg-chart-2/15 text-chart-2",
  "bg-chart-3/15 text-chart-3",
  "bg-chart-4/15 text-chart-4",
];

export default function SociosPage() {
  const [editPartner, setEditPartner] = useState<PartnerItem | null>(null);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Socios</h1>
          <p className="text-muted-foreground mt-1">
            {demoPartners.length} socios registrados
          </p>
        </div>
        <Button size="sm" className="gap-2 shadow-md shadow-primary/20" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4" /> Nuevo socio
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children">
        {demoPartners.map((partner, i) => {
          const role = roleLabels[partner.role];
          return (
            <Card
              key={partner.id}
              className="shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
              onClick={() => setEditPartner(partner)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className={`h-12 w-12 ${avatarColors[i % avatarColors.length]}`}>
                    <AvatarFallback className="text-base font-bold bg-transparent">
                      {partner.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{partner.full_name}</h3>
                      <Badge className={`text-[10px] ${role.color} border-0`}>{role.label}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                      <Phone className="w-3 h-3" />
                      <span>{partner.whatsapp_phone}</span>
                    </div>
                    {partner.email && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{partner.email}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <DollarSign className="w-3 h-3" />
                      <span>Total gastado</span>
                    </div>
                    <p className="text-lg font-bold mt-0.5">{formatCurrency(partner.total_spent)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit / New Dialog */}
      <Dialog open={!!editPartner || showNew} onOpenChange={() => { setEditPartner(null); setShowNew(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editPartner ? "Editar Socio" : "Nuevo Socio"}</DialogTitle>
            <DialogDescription>
              {editPartner ? "Modificá los datos del socio" : "Registrá un nuevo socio en el sistema"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Nombre completo</Label>
              <Input defaultValue={editPartner?.full_name || ""} className="mt-1 h-9" placeholder="Nombre" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" defaultValue={editPartner?.email || ""} className="mt-1 h-9" placeholder="email@ejemplo.com" />
            </div>
            <div>
              <Label className="text-xs">Teléfono WhatsApp</Label>
              <Input defaultValue={editPartner?.whatsapp_phone || ""} className="mt-1 h-9" placeholder="+5491112345678" />
            </div>
            <div>
              <Label className="text-xs">Rol</Label>
              <Select defaultValue={editPartner?.role || "partner"}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="partner">Socio</SelectItem>
                  <SelectItem value="readonly">Solo lectura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Activo</Label>
                <p className="text-xs text-muted-foreground">El socio puede operar en el sistema</p>
              </div>
              <Switch defaultChecked={editPartner?.is_active ?? true} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setEditPartner(null); setShowNew(false); }}>
                Cancelar
              </Button>
              <Button className="shadow-md shadow-primary/20" onClick={() => { setEditPartner(null); setShowNew(false); }}>
                {editPartner ? "Guardar" : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
