"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare,
  Bot,
  Users,
  CheckCircle2,
  AlertTriangle,
  Link as LinkIcon,
  Link2Off,
  User,
  Hash,
  Loader2,
} from "lucide-react";

interface WhatsAppGroup {
  id: string;
  name: string;
  is_active: boolean;
  member_count: number;
  participants: { phone: string; pushname: string }[];
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Organization {
  id: string;
  name: string;
  whatsapp_group_id: string | null;
}

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

export default function GruposPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [org, setOrg] = useState<Organization | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<WhatsAppGroup | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function checkRoleAndLoadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        // Check if user is super_admin
        const { data: profile } = await supabase
          .from("users_profile")
          .select("role, organization_id")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (!profile || profile.role !== "super_admin") {
          setIsSuperAdmin(false);
          setLoading(false);
          return;
        }

        setIsSuperAdmin(true);

        // Load organization
        const { data: orgData } = await supabase
          .from("organizations")
          .select("id, name, whatsapp_group_id")
          .eq("id", profile.organization_id)
          .single();

        setOrg(orgData);

        // Load WhatsApp groups
        const { data: groupsData } = await supabase
          .from("whatsapp_groups")
          .select("*")
          .order("is_active", { ascending: false })
          .order("updated_at", { ascending: false });

        setGroups(groupsData || []);
        
        if (groupsData && groupsData.length > 0) {
          // Default selection: currently linked group, or first group
          const linked = groupsData.find(g => g.id === orgData?.whatsapp_group_id);
          setSelectedGroup(linked || groupsData[0]);
        }
      } catch (err) {
        console.error("Error loading groups page:", err);
      } finally {
        setLoading(false);
      }
    }

    checkRoleAndLoadData();
  }, [supabase, router]);

  async function handleLinkGroup(groupId: string) {
    if (!org) return;
    setActionLoading(true);
    try {
      // 1. Update organization linked group
      const { error: orgError } = await supabase
        .from("organizations")
        .update({ whatsapp_group_id: groupId })
        .eq("id", org.id);

      if (orgError) throw orgError;

      // 2. Fetch group to sync its participants as profiles
      const targetGroup = groups.find(g => g.id === groupId);
      if (targetGroup && targetGroup.participants) {
        // Fetch existing profiles to avoid duplicates
        const { data: existingProfiles } = await supabase
          .from("users_profile")
          .select("whatsapp_phone")
          .eq("organization_id", org.id);

        const existingPhones = new Set(existingProfiles?.map(p => p.whatsapp_phone) || []);

        for (const p of targetGroup.participants) {
          const cleanPhone = p.phone;
          if (!existingPhones.has(cleanPhone)) {
            const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
            await supabase
              .from("users_profile")
              .insert({
                organization_id: org.id,
                full_name: p.pushname || `Socio ${cleanPhone}`,
                whatsapp_phone: cleanPhone,
                role: "partner",
                is_active: true,
                color: randomColor,
              });
          }
        }
      }

      // Update local state
      setOrg(prev => prev ? { ...prev, whatsapp_group_id: groupId } : null);
      
      // Reload groups to reflect organization link
      const { data: groupsData } = await supabase
        .from("whatsapp_groups")
        .select("*")
        .order("is_active", { ascending: false })
        .order("updated_at", { ascending: false });
      setGroups(groupsData || []);
      
      const updatedGroup = groupsData?.find(g => g.id === groupId);
      if (updatedGroup) setSelectedGroup(updatedGroup);

    } catch (err) {
      console.error("Error linking group:", err);
      alert("Hubo un error al vincular el grupo");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnlinkGroup() {
    if (!org) return;
    setActionLoading(true);
    try {
      const { error: orgError } = await supabase
        .from("organizations")
        .update({ whatsapp_group_id: null })
        .eq("id", org.id);

      if (orgError) throw orgError;

      setOrg(prev => prev ? { ...prev, whatsapp_group_id: null } : null);
      
      // Reload groups
      const { data: groupsData } = await supabase
        .from("whatsapp_groups")
        .select("*")
        .order("is_active", { ascending: false })
        .order("updated_at", { ascending: false });
      setGroups(groupsData || []);
      
      if (selectedGroup) {
        const updatedGroup = groupsData?.find(g => g.id === selectedGroup.id);
        if (updatedGroup) setSelectedGroup(updatedGroup);
      }
    } catch (err) {
      console.error("Error unlinking group:", err);
      alert("Hubo un error al desvincular el grupo");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando grupos...</p>
        </div>
      </div>
    );
  }

  if (isSuperAdmin === false) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3 max-w-md p-6 bg-destructive/10 rounded-2xl border border-destructive/20">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Acceso Denegado</h2>
          <p className="text-sm text-muted-foreground">
            Esta pantalla es exclusiva para usuarios con el rol de Super Administrador. Contactá al soporte si creés que esto es un error.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Grupos de WhatsApp</h1>
        <p className="text-muted-foreground mt-1">
          Vinculación del bot de WhatsApp a la organización y control de participantes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Groups List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Grupos detectados ({groups.length})
          </h2>
          
          {groups.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center space-y-3">
                <Bot className="w-12 h-12 text-muted-foreground/50 mx-auto" />
                <p className="text-sm font-medium text-muted-foreground">Ningún grupo sincronizado</p>
                <p className="text-xs text-muted-foreground">
                  Asegurate de que el bot de WhatsApp esté corriendo y haya sincronizado al menos un grupo de WhatsApp.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => {
                const isLinked = org?.whatsapp_group_id === group.id;
                const isSelected = selectedGroup?.id === group.id;
                return (
                  <Card
                    key={group.id}
                    className={`cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : isLinked
                        ? "border-indigo-500"
                        : "border-muted"
                    }`}
                    onClick={() => setSelectedGroup(group)}
                  >
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm truncate">{group.name}</h3>
                          {isLinked && (
                            <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 text-[10px]">
                              Vinculado
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {group.member_count} miembros
                          </span>
                          <span>•</span>
                          <span className="truncate max-w-[120px] font-mono text-[10px]">
                            {group.id.split("@")[0]}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${group.is_active ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-muted text-muted-foreground border-transparent"}`}
                      >
                        {group.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Group Details & Linking */}
        <div className="lg:col-span-2">
          {selectedGroup ? (
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold">{selectedGroup.name}</CardTitle>
                    <CardDescription className="font-mono text-xs select-all">
                      JID: {selectedGroup.id}
                    </CardDescription>
                  </div>
                  <div>
                    {org?.whatsapp_group_id === selectedGroup.id ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={actionLoading}
                        onClick={handleUnlinkGroup}
                        className="gap-2"
                      >
                        <Link2Off className="w-4 h-4" /> Desvincular Grupo
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleLinkGroup(selectedGroup.id)}
                        className="gap-2 shadow-md shadow-primary/20 bg-indigo-600 hover:bg-indigo-700"
                      >
                        <LinkIcon className="w-4 h-4" /> Vincular a "{org?.name}"
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Connection Alert/Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Estado de Conexión del Bot
                    </span>
                    <div className="flex items-center gap-2">
                      {selectedGroup.is_active ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          <span className="text-sm font-semibold">Conectado / Activo</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          <span className="text-sm font-semibold">Inactivo (El bot salió)</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Vinculación
                    </span>
                    <div className="flex items-center gap-2">
                      {org?.whatsapp_group_id === selectedGroup.id ? (
                        <>
                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                          <span className="text-sm font-semibold">
                            Registrando gastos del grupo en "{org.name}"
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
                          <span className="text-sm font-semibold text-muted-foreground">
                            Gastos de este grupo ignorados
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Participants list */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-base">Participantes detectados ({selectedGroup.participants.length})</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Contactos del grupo sincronizados por el bot. Al vincular el grupo, estos números se registran como socios automáticamente.
                    </p>
                  </div>

                  <ScrollArea className="h-[350px] pr-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedGroup.participants.map((participant, index) => {
                        const initials = participant.pushname.charAt(0).toUpperCase();
                        return (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/30 transition-colors"
                          >
                            <Avatar className="h-8 w-8 bg-primary/10 text-primary">
                              <AvatarFallback className="text-xs font-semibold bg-transparent">
                                {initials || <User className="w-4 h-4" />}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{participant.pushname}</p>
                              <p className="text-[11px] text-muted-foreground font-mono">
                                +{participant.phone}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full border-dashed flex items-center justify-center">
              <div className="p-8 text-center max-w-sm space-y-3">
                <MessageSquare className="w-12 h-12 text-muted-foreground/45 mx-auto" />
                <h3 className="font-semibold text-base text-muted-foreground">Seleccioná un grupo</h3>
                <p className="text-xs text-muted-foreground">
                  Elegí un grupo del listado de la izquierda para ver sus detalles, participantes y configurar su vinculación.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
