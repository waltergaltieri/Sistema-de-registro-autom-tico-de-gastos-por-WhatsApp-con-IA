"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
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
import {
  Users,
  Plus,
  Pencil,
  Phone,
  Mail,
  Shield,
  DollarSign,
  IdCard,
  Palette,
  Key,
  Loader2,
  AlertCircle,
  Check,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface PartnerItem {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  last_name: string | null;
  email: string | null;
  whatsapp_phone: string;
  role: "super_admin" | "admin" | "partner" | "readonly";
  is_active: boolean;
  color: string;
  dni: string | null;
  cuil: string | null;
  total_spent?: number;
}

const roleLabels = {
  super_admin: { label: "Super Admin", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  admin: { label: "Admin", color: "bg-primary/10 text-primary border-primary/20" },
  partner: { label: "Socio", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  readonly: { label: "Solo lectura", color: "bg-muted text-muted-foreground border-border" },
};

const PRESET_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#84cc16", // Lime
];

export default function SociosPage() {
  const supabase = createClient();
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [editPartner, setEditPartner] = useState<PartnerItem | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [dni, setDni] = useState("");
  const [cuil, setCuil] = useState("");
  const [role, setRole] = useState<PartnerItem["role"]>("partner");
  const [isActive, setIsActive] = useState(true);
  const [color, setColor] = useState("#3b82f6");
  const [password, setPassword] = useState("");
  const [enableAccess, setEnableAccess] = useState(false);

  // Fetch partners and their expenses from Supabase
  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // 1. Get partners profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("users_profile")
        .select("*")
        .order("full_name", { ascending: true });

      if (profilesError) throw profilesError;

      // 2. Get total expenses grouped by profile
      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select("created_by_profile_id, total_amount");

      if (expensesError) throw expensesError;

      const spentByPartner: Record<string, number> = {};
      expenses?.forEach((exp) => {
        if (exp.created_by_profile_id) {
          spentByPartner[exp.created_by_profile_id] =
            (spentByPartner[exp.created_by_profile_id] || 0) + Number(exp.total_amount || 0);
        }
      });

      // Combine profiles with total spent
      const combined: PartnerItem[] = (profiles || []).map((p) => ({
        ...p,
        total_spent: spentByPartner[p.id] || 0,
      }));

      setPartners(combined);
    } catch (err: any) {
      console.error("Error loading partners:", err);
      setError(err.message || "Error al cargar los socios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [supabase]);

  // Sync form states with selected partner for editing
  useEffect(() => {
    if (editPartner) {
      setFullName(editPartner.full_name || "");
      setLastName(editPartner.last_name || "");
      setEmail(editPartner.email || "");
      setWhatsappPhone(editPartner.whatsapp_phone || "");
      setDni(editPartner.dni || "");
      setCuil(editPartner.cuil || "");
      setRole(editPartner.role || "partner");
      setIsActive(editPartner.is_active);
      setColor(editPartner.color || "#3b82f6");
      setPassword("");
      setEnableAccess(!!editPartner.auth_user_id || !!editPartner.email);
    } else {
      // Defaults for new partner
      setFullName("");
      setLastName("");
      setEmail("");
      setWhatsappPhone("");
      setDni("");
      setCuil("");
      setRole("partner");
      setIsActive(true);
      setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
      setPassword("");
      setEnableAccess(false);
    }
    setFormError(null);
  }, [editPartner, showNew]);

  async function handleSubmit() {
    setFormLoading(true);
    setFormError(null);
    try {
      if (!fullName.trim() || !whatsappPhone.trim()) {
        throw new Error("Nombre y Teléfono son requeridos");
      }

      // Check phone format: digits only
      const cleanPhone = whatsappPhone.replace(/\D/g, "");
      if (cleanPhone.length < 8) {
        throw new Error("El teléfono de WhatsApp debe tener un formato válido (números únicamente)");
      }

      if (enableAccess && !email.trim()) {
        throw new Error("El Email es requerido para habilitar el acceso al sistema");
      }

      // Payload for our admin API route
      const payload = {
        id: editPartner?.id || null,
        full_name: fullName.trim(),
        last_name: lastName.trim() || null,
        email: email.trim() || null,
        whatsapp_phone: cleanPhone,
        role,
        is_active: isActive,
        color,
        dni: dni.trim() || null,
        cuil: cuil.trim() || null,
        password: enableAccess && password.trim() ? password.trim() : undefined,
      };

      const response = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Hubo un error al procesar el usuario");
      }

      // Close modal and reload data
      setEditPartner(null);
      setShowNew(false);
      loadData();
    } catch (err: any) {
      console.error("Submit partner error:", err);
      setFormError(err.message || "Error al guardar los cambios");
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Socios</h1>
          <p className="text-muted-foreground mt-1">
            {partners.length} socios registrados en la organización
          </p>
        </div>
        <Button
          size="sm"
          className="gap-2 shadow-md shadow-primary/20 bg-primary hover:bg-primary/90"
          onClick={() => setShowNew(true)}
        >
          <Plus className="w-4 h-4" /> Nuevo socio
        </Button>
      </div>

      {loading ? (
        <div className="h-[40vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Cargando socios...</p>
          </div>
        </div>
      ) : error ? (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-6 flex items-center gap-3 text-destructive">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children animate-fade-in">
          {partners.map((partner) => {
            const role = roleLabels[partner.role] || roleLabels.readonly;
            const initials = partner.full_name.charAt(0).toUpperCase();
            const avatarBg = { backgroundColor: `${partner.color}15`, color: partner.color };
            
            return (
              <Card
                key={partner.id}
                className="shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer border border-border/60 hover:border-border"
                onClick={() => setEditPartner(partner)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12 border border-border/20">
                      <AvatarFallback
                        className="text-base font-bold"
                        style={avatarBg}
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">
                          {partner.full_name} {partner.last_name || ""}
                        </h3>
                        <Badge variant="outline" className={`text-[9px] px-2 py-0 border ${role.color}`}>
                          {role.label}
                        </Badge>
                        {!partner.is_active && (
                          <Badge variant="secondary" className="text-[9px] px-2 py-0">
                            Inactivo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                        <Phone className="w-3.5 h-3.5" />
                        <span>+{partner.whatsapp_phone}</span>
                      </div>
                      {partner.email && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Mail className="w-3.5 h-3.5" />
                          <span className="truncate">{partner.email}</span>
                        </div>
                      )}
                      {(partner.dni || partner.cuil) && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                          <IdCard className="w-3.5 h-3.5" />
                          <span>
                            {partner.dni ? `DNI: ${partner.dni}` : ""}
                            {partner.dni && partner.cuil ? " | " : ""}
                            {partner.cuil ? `CUIL: ${partner.cuil}` : ""}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                        <DollarSign className="w-3.5 h-3.5 text-muted-foreground/75" />
                        <span>Gastado</span>
                      </div>
                      <p className="text-base font-bold mt-0.5">
                        {formatCurrency(partner.total_spent || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit / New Dialog */}
      <Dialog
        open={!!editPartner || showNew}
        onOpenChange={() => {
          setEditPartner(null);
          setShowNew(false);
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editPartner ? "Editar Socio" : "Nuevo Socio"}</DialogTitle>
            <DialogDescription>
              {editPartner
                ? "Modificá la información personal y permisos del socio"
                : "Agregá un nuevo integrante y asignale credenciales de acceso"}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nombre *</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 h-9"
                  placeholder="Walter"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Apellido</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 h-9"
                  placeholder="Galtieri"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">DNI</Label>
                <Input
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  className="mt-1 h-9"
                  placeholder="12345678"
                />
              </div>
              <div>
                <Label className="text-xs">CUIL</Label>
                <Input
                  value={cuil}
                  onChange={(e) => setCuil(e.target.value)}
                  className="mt-1 h-9"
                  placeholder="20-12345678-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Número de WhatsApp *</Label>
              <Input
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                className="mt-1 h-9"
                placeholder="5491112345678"
                required
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Con código de país y de área (ej: 54911...). No incluir "+" ni espacios.
              </p>
            </div>

            {/* Graphic Color Selector */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                Color asignado para gráficos
              </Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-7 h-7 rounded-full transition-transform active:scale-95 flex items-center justify-center shrink-0 border"
                    style={{ backgroundColor: c, borderColor: color === c ? '#fff' : 'transparent', borderWidth: '2px' }}
                  >
                    {color === c && (
                      <Check className="w-4 h-4 text-white drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                Rol del usuario
              </Label>
              <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partner">Socio</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="readonly">Solo lectura</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between py-2 border-y border-border/50">
              <div>
                <Label className="text-sm font-semibold">Estado Activo</Label>
                <p className="text-[11px] text-muted-foreground">El socio está activo y habilitado en el sistema</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            {/* Auth credentials block */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                  <Key className="w-3.5 h-3.5 text-muted-foreground" />
                  Habilitar acceso al sistema
                </Label>
                <Switch checked={enableAccess} onCheckedChange={setEnableAccess} />
              </div>

              {enableAccess && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-muted/40 border border-border/60 animate-fade-in space-y-3">
                  <div>
                    <Label className="text-xs">Correo Electrónico *</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 h-9 bg-background"
                      placeholder="walter@ejemplo.com"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">
                      {editPartner?.auth_user_id
                        ? "Nueva Contraseña (dejar vacío para no cambiar)"
                        : "Contraseña *"}
                    </Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 h-9 bg-background"
                      placeholder="••••••••"
                      required={!editPartner?.auth_user_id}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
              <Button
                variant="outline"
                type="button"
                disabled={formLoading}
                onClick={() => {
                  setEditPartner(null);
                  setShowNew(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={formLoading}
                onClick={handleSubmit}
                className="shadow-md shadow-primary/20 bg-primary hover:bg-primary/90"
              >
                {formLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Guardando...
                  </>
                ) : editPartner ? (
                  "Guardar cambios"
                ) : (
                  "Crear socio"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
