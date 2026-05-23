"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getBotConnectionView } from "@/lib/bot-status";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Loader2,
  Wifi,
  WifiOff,
  QrCode,
  Send,
  Check,
  X,
  Search,
  RefreshCw,
  ExternalLink,
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function GruposPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  
  // Bot status
  const [botStatus, setBotStatus] = useState<string>("desconectado");
  const [botQrCode, setBotQrCode] = useState<string | null>(null);
  const [refreshingStatus, setRefreshingStatus] = useState(false);

  // Group linking
  const [searchName, setSearchName] = useState("");
  const [searchingGroup, setSearchingGroup] = useState(false);
  const [matchedGroups, setMatchedGroups] = useState<WhatsAppGroup[]>([]);
  const [searchFeedback, setSearchFeedback] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });
  const [linkedGroup, setLinkedGroup] = useState<WhatsAppGroup | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Test Message Command
  const [testState, setTestState] = useState<"idle" | "queuing" | "polling" | "delivered" | "failed">("idle");
  const [pendingCommandId, setPendingCommandId] = useState<string | null>(null);
  const [testError, setTestError] = useState("");
  const [userConfirmed, setUserConfirmed] = useState<boolean | null>(null);
  const botConnectionView = getBotConnectionView(botStatus);

  const fetchBotStatus = useCallback(async (showLoader = true) => {
    if (showLoader) setRefreshingStatus(true);
    try {
      const res = await fetch("/api/bot/status");
      const data = await res.json();
      if (data.ok) {
        setBotStatus(data.status);
        setBotQrCode(data.qr_code);
      }
    } catch (err) {
      console.error("Error fetching bot status:", err);
    } finally {
      if (showLoader) setRefreshingStatus(false);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        // Check if user is admin or super_admin
        const { data: profile } = await supabase
          .from("users_profile")
          .select("role, organization_id")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (!profile || (profile.role !== "super_admin" && profile.role !== "admin")) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setIsAdmin(true);

        // Load organization
        const { data: orgData } = await supabase
          .from("organizations")
          .select("id, name, whatsapp_group_id")
          .eq("id", profile.organization_id)
          .single();

        setOrg(orgData);

        // If organization has a linked group, load it
        if (orgData?.whatsapp_group_id) {
          const { data: groupData } = await supabase
            .from("whatsapp_groups")
            .select("*")
            .eq("id", orgData.whatsapp_group_id)
            .maybeSingle();
          if (groupData) {
            setLinkedGroup(groupData);
          }
        }

        // Load bot status initially
        await fetchBotStatus();

      } catch (err) {
        console.error("Error loading groups page:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase, router, fetchBotStatus]);

  // Poll Bot Status while waiting for connection or QR
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (botStatus === "esperando_vinculacion" || botStatus === "desconectado") {
      // Poll every 3 seconds to check if status changes (e.g. QR scanned)
      intervalId = setInterval(() => {
        fetchBotStatus(false);
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [botStatus, fetchBotStatus]);

  // Poll Test Command status
  useEffect(() => {
    let commandIntervalId: NodeJS.Timeout;

    if (testState === "polling" && pendingCommandId) {
      commandIntervalId = setInterval(async () => {
        try {
          const { data: cmd, error } = await supabase
            .from("bot_commands")
            .select("status, error_message")
            .eq("id", pendingCommandId)
            .single();

          if (error) throw error;

          if (cmd.status === "completed") {
            setTestState("delivered");
            clearInterval(commandIntervalId);
          } else if (cmd.status === "failed") {
            setTestState("failed");
            setTestError(cmd.error_message || "El bot no pudo enviar el mensaje.");
            clearInterval(commandIntervalId);
          }
        } catch (err) {
          console.error("Error polling command:", err);
        }
      }, 2000);
    }

    return () => {
      if (commandIntervalId) clearInterval(commandIntervalId);
    };
  }, [testState, pendingCommandId, supabase]);

  const handleSearchAndLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchName.trim()) return;

    setSearchingGroup(true);
    setSearchFeedback({ type: null, message: "" });
    setMatchedGroups([]);

    try {
      // Find groups matching the name
      const { data: groups, error } = await supabase
        .from("whatsapp_groups")
        .select("*")
        .ilike("name", `%${searchName.trim()}%`)
        .order("is_active", { ascending: false });

      if (error) throw error;

      if (!groups || groups.length === 0) {
        setSearchFeedback({
          type: "error",
          message: `No se encontró ningún grupo que coincida con "${searchName}". Asegúrate de que el bot esté agregado como participante en ese grupo.`,
        });
      } else if (groups.length === 1) {
        // Link immediately if only one matches
        await linkGroup(groups[0]);
      } else {
        // Show options if multiple match
        setMatchedGroups(groups);
        setSearchFeedback({
          type: "success",
          message: `Se encontraron ${groups.length} grupos. Por favor selecciona cuál deseas vincular:`,
        });
      }
    } catch (err) {
      console.error("Error searching group:", err);
      setSearchFeedback({ type: "error", message: "Error al buscar el grupo en la base de datos." });
    } finally {
      setSearchingGroup(false);
    }
  };

  const linkGroup = async (group: WhatsAppGroup) => {
    if (!org) return;
    setActionLoading(true);
    try {
      // 1. Update organization whatsapp_group_id
      const { error: orgError } = await supabase
        .from("organizations")
        .update({ whatsapp_group_id: group.id })
        .eq("id", org.id);

      if (orgError) throw orgError;

      // 2. Set organization_id in whatsapp_groups table
      const { error: groupError } = await supabase
        .from("whatsapp_groups")
        .update({ organization_id: org.id })
        .eq("id", group.id);

      if (groupError) throw groupError;

      // 3. Sync participants to users_profile
      if (group.participants && group.participants.length > 0) {
        const { data: existingProfiles } = await supabase
          .from("users_profile")
          .select("whatsapp_phone")
          .eq("organization_id", org.id);

        const existingPhones = new Set(existingProfiles?.map(p => p.whatsapp_phone) || []);

        for (const p of group.participants) {
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

      setLinkedGroup(group);
      setOrg(prev => prev ? { ...prev, whatsapp_group_id: group.id } : null);
      setMatchedGroups([]);
      setSearchFeedback({
        type: "success",
        message: `¡Grupo "${group.name}" vinculado con éxito! Se han registrado sus participantes como socios del sistema.`,
      });
      setSearchName("");
    } catch (err) {
      console.error("Error linking group:", err);
      alert("Hubo un error al vincular el grupo.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!org || !linkedGroup) return;
    if (!confirm(`¿Estás seguro de que quieres desvincular el grupo "${linkedGroup.name}"? Se dejarán de leer los gastos de este grupo.`)) return;

    setActionLoading(true);
    try {
      // Remove whatsapp_group_id from organization
      const { error: orgError } = await supabase
        .from("organizations")
        .update({ whatsapp_group_id: null })
        .eq("id", org.id);

      if (orgError) throw orgError;

      // Remove organization_id from whatsapp_group
      await supabase
        .from("whatsapp_groups")
        .update({ organization_id: null })
        .eq("id", linkedGroup.id);

      setLinkedGroup(null);
      setOrg(prev => prev ? { ...prev, whatsapp_group_id: null } : null);
      setSearchFeedback({ type: null, message: "" });
      setTestState("idle");
      setUserConfirmed(null);
    } catch (err) {
      console.error("Error unlinking group:", err);
      alert("Hubo un error al desvincular el grupo.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogoutWhatsApp = async () => {
    if (!confirm("¿Estás seguro de que quieres cerrar la sesión de WhatsApp del bot? Esto detendrá el registro de gastos hasta que vincules una nueva cuenta.")) return;
    
    setLogoutLoading(true);
    try {
      const res = await fetch("/api/bot/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "queue",
          command: "logout_whatsapp",
          payload: {}
        }),
      });

      const data = await res.json();
      if (data.ok && data.command?.id) {
        // Poll for status changes
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          const statusRes = await fetch("/api/bot/status");
          const statusData = await statusRes.json();
          if (statusData.ok) {
            if (statusData.status !== "conectado" || attempts > 15) {
              clearInterval(interval);
              setBotStatus(statusData.status);
              setBotQrCode(statusData.qr_code);
              setLogoutLoading(false);
              if (statusData.status !== "conectado") {
                alert("Sesión de WhatsApp cerrada con éxito. El bot se está reiniciando para generar un nuevo código QR.");
              } else {
                alert("No se pudo confirmar el cierre de sesión en el bot, pero el comando fue enviado. Por favor actualiza la página en unos segundos.");
              }
            }
          }
        }, 2000);
      } else {
        throw new Error(data.error || "No se pudo encolar el comando de cierre de sesión.");
      }
    } catch (err: unknown) {
      console.error("Error logging out WhatsApp:", err);
      alert(getErrorMessage(err, "Error al intentar cerrar la sesión."));
      setLogoutLoading(false);
    }
  };

  const sendTestMessage = async () => {
    if (!linkedGroup) return;
    setTestState("queuing");
    setTestError("");
    setUserConfirmed(null);

    try {
      const res = await fetch("/api/bot/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "queue",
          command: "send_test_message",
          payload: {
            chat_id: linkedGroup.id,
            message_text: "📢 *Mensaje de Prueba Gastos Socios*\n\n¡Hola! Este mensaje confirma que el bot de WhatsApp se vinculó correctamente a este grupo y está listo para registrar tus gastos con Inteligencia Artificial. 🚀",
          },
        }),
      });

      const data = await res.json();
      if (data.ok && data.command?.id) {
        setPendingCommandId(data.command.id);
        setTestState("polling");
      } else {
        throw new Error(data.error || "No se pudo encolar el comando.");
      }
    } catch (err: unknown) {
      console.error("Error sending test message:", err);
      setTestState("failed");
      setTestError(getErrorMessage(err, "Error de red al enviar el mensaje de prueba."));
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando panel de control...</p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3 max-w-md p-6 bg-destructive/10 rounded-2xl border border-destructive/20">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Acceso Denegado</h2>
          <p className="text-sm text-muted-foreground">
            Esta pantalla es exclusiva para administradores del sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Vinculación del Asistente
          </h1>
          <p className="text-muted-foreground mt-1">
            Conecta tu cuenta de WhatsApp y configura el grupo del cual recopilar gastos automáticamente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <Button
            size="sm"
            render={<Link href="/vincular" target="_blank" />}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20"
          >
            <QrCode className="w-4 h-4" />
            {botConnectionView.actionLabel}
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchBotStatus(true)}
            disabled={refreshingStatus}
            className="gap-2 backdrop-blur-sm bg-card/50 hover:bg-card border-border/80"
          >
            <RefreshCw className={`w-4 h-4 ${refreshingStatus ? "animate-spin" : ""}`} />
            Actualizar estado
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* PASO 1: ESTADO DEL BOT & QR */}
        <Card className="overflow-hidden border border-border/60 shadow-lg bg-card/40 backdrop-blur-md">
          <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-extrabold text-indigo-500 tracking-wider">
                  Paso 1
                </span>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-500" />
                  {botConnectionView.title}
                </CardTitle>
                <CardDescription>
                  {botConnectionView.description}
                </CardDescription>
              </div>
              <div>
                {botStatus === "conectado" ? (
                  <Badge className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 gap-1.5 px-3 py-1 text-xs">
                    <Wifi className="w-3.5 h-3.5" />
                    {botConnectionView.label}
                  </Badge>
                ) : botStatus === "esperando_vinculacion" ? (
                  <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/30 gap-1.5 px-3 py-1 text-xs animate-pulse">
                    <QrCode className="w-3.5 h-3.5" />
                    {botConnectionView.label}
                  </Badge>
                ) : (
                  <Badge className="bg-destructive/15 text-destructive border border-destructive/30 gap-1.5 px-3 py-1 text-xs">
                    <WifiOff className="w-3.5 h-3.5" />
                    {botConnectionView.label}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {botStatus === "conectado" ? (
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-6">
                  <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-500 shrink-0">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-1 text-left">
                    <h3 className="font-bold text-foreground text-base">¡WhatsApp Vinculado Exitosamente!</h3>
                    <p className="text-sm text-muted-foreground max-w-xl">
                      La sesión del bot de WhatsApp está activa y en línea. El bot está listo para escuchar y registrar los mensajes de tu grupo configurado.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0 self-start md:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href="/vincular" target="_blank" />}
                    className="gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    Ver vinculador
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogoutWhatsApp}
                    disabled={actionLoading || logoutLoading}
                    className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-2"
                  >
                    {logoutLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2Off className="w-4 h-4" />
                    )}
                    Cerrar sesión
                  </Button>
                </div>
              </div>
            ) : botStatus === "esperando_vinculacion" && botQrCode ? (
              <div className="flex flex-col lg:flex-row items-center justify-center gap-10 p-6">
                <div className="flex flex-col items-center space-y-4 max-w-sm text-center lg:text-left lg:items-start">
                  <h3 className="text-lg font-bold text-foreground">Escanea el código QR</h3>
                  <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2.5">
                    <li>Abre <span className="font-semibold text-foreground">WhatsApp</span> en tu teléfono celular.</li>
                    <li>Ve a <span className="font-semibold text-foreground">Configuración / Dispositivos vinculados</span>.</li>
                    <li>Toca en <span className="font-semibold text-foreground">Vincular un dispositivo</span>.</li>
                    <li>Apunta tu cámara a esta pantalla para escanear el código QR.</li>
                  </ol>
                  <p className="text-xs text-amber-500/90 font-medium">
                    ⚠️ El código se actualiza automáticamente. Mantén esta pantalla abierta.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href="/vincular" target="_blank" />}
                    className="gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir QR en pantalla dedicada
                  </Button>
                </div>
                <div className="relative p-5 bg-white rounded-3xl shadow-xl border border-border/80 flex items-center justify-center overflow-hidden">
                  <img
                    src={botQrCode}
                    alt="WhatsApp QR Code"
                    className="w-56 h-56 object-contain"
                  />
                  {/* Glowing Laser Scan Animation */}
                  <div className="absolute left-0 right-0 top-0 h-1 bg-indigo-500 shadow-[0_0_10px_2px_rgba(99,102,241,0.8)] animate-[bounce_3s_infinite]" />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                  <div className="p-3 bg-amber-500/10 rounded-full text-amber-500 shrink-0">
                    <WifiOff className="w-10 h-10" />
                  </div>
                  <div className="space-y-2 text-left flex-1">
                    <h3 className="font-bold text-foreground text-base">{botConnectionView.title}</h3>
                    <p className="text-sm text-muted-foreground max-w-2xl">
                      {botStatus === "esperando_vinculacion"
                        ? "El bot está preparando un código QR. Si no aparece en unos segundos, abrí la pantalla dedicada y verificá que el proceso del bot esté corriendo."
                        : "El asistente de WhatsApp se encuentra desconectado. Para vincular un número de teléfono y comenzar a registrar gastos, abrí la vinculación y verificá que el servicio del bot esté activo en el servidor."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0 self-start md:self-center">
                    <Button
                      render={<Link href="/vincular" target="_blank" />}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-medium"
                    >
                      <QrCode className="w-4 h-4" />
                      {botConnectionView.actionLabel}
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => fetchBotStatus(true)}
                      disabled={refreshingStatus}
                      className="gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshingStatus ? "animate-spin" : ""}`} />
                      Reintentar conexión
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PASO 2: VINCULAR GRUPO POR NOMBRE */}
        <Card className="border border-border/60 shadow-lg bg-card/40 backdrop-blur-md">
          <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-border/50">
            <span className="text-[10px] uppercase font-extrabold text-indigo-500 tracking-wider">
              Paso 2
            </span>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-500" />
              Configurar Grupo de WhatsApp
            </CardTitle>
            <CardDescription>
              Escribe el nombre del grupo de WhatsApp al que quieres que el bot le extraiga los gastos.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            {/* Si ya hay un grupo vinculado */}
            {linkedGroup ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Grupo Vinculado</span>
                    <h3 className="text-lg font-extrabold text-foreground">{linkedGroup.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {linkedGroup.member_count} miembros (socios)
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[10px]">
                        ID: {linkedGroup.id}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnlink}
                    disabled={actionLoading}
                    className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-2 shrink-0 self-end sm:self-auto"
                  >
                    <Link2Off className="w-4 h-4" /> Desvincular Grupo
                  </Button>
                </div>

                {/* Mostrar lista colapsable de participantes si se quiere */}
                <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Socios detectados en el grupo ({linkedGroup.participants.length})
                  </h4>
                  <ScrollArea className="h-44 pr-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {linkedGroup.participants.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 p-2 rounded-lg bg-card/60 border border-border/40">
                          <Avatar className="h-7 w-7 text-xs bg-indigo-500/10 text-indigo-500">
                            <AvatarFallback className="font-bold">
                              {p.pushname ? p.pushname.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate text-foreground">{p.pushname}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">+{p.phone}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <form onSubmit={handleSearchAndLink} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="group-name" className="text-sm font-semibold">
                      Nombre del Grupo en WhatsApp
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="group-name"
                          type="text"
                          placeholder="ej. Gastos Obra o Consorcio Alquileres"
                          value={searchName}
                          onChange={(e) => setSearchName(e.target.value)}
                          className="pl-9 bg-card/50"
                          disabled={searchingGroup || actionLoading}
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={searchingGroup || actionLoading || !searchName.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 gap-2 font-medium shrink-0"
                      >
                        {searchingGroup ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <LinkIcon className="w-4 h-4" />
                        )}
                        Vincular
                      </Button>
                    </div>
                  </div>
                </form>

                {/* Feedback de la búsqueda */}
                {searchFeedback.message && (
                  <div className={`p-4 rounded-xl border text-sm ${
                    searchFeedback.type === "success" 
                      ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-destructive/5 border-destructive/20 text-destructive dark:text-destructive-400"
                  }`}>
                    {searchFeedback.message}
                  </div>
                )}

                {/* Selección múltiple en caso de que coincidan varios */}
                {matchedGroups.length > 0 && (
                  <div className="space-y-3 p-4 rounded-xl border border-border/80 bg-muted/10">
                    {matchedGroups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/60 hover:shadow-sm transition-all"
                      >
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-sm text-foreground">{group.name}</h4>
                          <p className="text-xs text-muted-foreground font-mono">
                            ID: {group.id.split("@")[0]} | {group.member_count} miembros
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => linkGroup(group)}
                          disabled={actionLoading}
                          className="bg-indigo-600 hover:bg-indigo-700 text-xs py-1.5 h-8 px-3"
                        >
                          Vincular
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PASO 3: MENSAJE DE PRUEBA Y CONFIRMACIÓN */}
        {linkedGroup && (
          <Card className="border border-border/60 shadow-lg bg-card/40 backdrop-blur-md">
            <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-border/50">
              <span className="text-[10px] uppercase font-extrabold text-indigo-500 tracking-wider">
                Paso 3
              </span>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-500" />
                Validar Funcionamiento (Mensaje de Prueba)
              </CardTitle>
              <CardDescription>
                Envía un mensaje de prueba al grupo de WhatsApp para comprobar que el bot puede enviar alertas.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {botStatus !== "conectado" ? (
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
                    <p className="font-bold">WhatsApp no está conectado</p>
                    <p>El bot debe estar en línea (Paso 1) para poder enviar mensajes de prueba al grupo.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {testState === "idle" && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Al hacer clic, el bot enviará un mensaje de saludo al grupo <span className="font-bold text-foreground">&quot;{linkedGroup.name}&quot;</span> confirmando la vinculación.
                      </p>
                      <Button
                        onClick={sendTestMessage}
                        className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 gap-2"
                      >
                        <Send className="w-4 h-4" /> Enviar Mensaje de Prueba
                      </Button>
                    </div>
                  )}

                  {(testState === "queuing" || testState === "polling") && (
                    <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 border border-dashed rounded-2xl">
                      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-foreground">Enviando mensaje de prueba...</h4>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          El bot está procesando el envío del mensaje en WhatsApp. Espera un momento mientras confirmamos el envío.
                        </p>
                      </div>
                    </div>
                  )}

                  {testState === "delivered" && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-5 h-5 shrink-0" />
                        <div className="text-xs">
                          <p className="font-bold text-sm">¡Mensaje enviado con éxito por el bot!</p>
                          <p className="mt-0.5">El bot reportó el envío del mensaje a WhatsApp correctamente.</p>
                        </div>
                      </div>

                      <div className="p-5 border border-border/80 rounded-2xl bg-card space-y-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-foreground">
                            ¿Llegó el mensaje de prueba a tu grupo de WhatsApp?
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Por favor revisa el chat de tu grupo de WhatsApp y confirma si recibiste la alerta del bot.
                          </p>
                        </div>

                        {userConfirmed === null ? (
                          <div className="flex items-center gap-3">
                            <Button
                              onClick={() => setUserConfirmed(true)}
                              className="bg-emerald-600 hover:bg-emerald-700 shadow-sm text-xs font-semibold gap-1.5 px-4 h-9"
                            >
                              <Check className="w-4 h-4" /> Sí, llegó correctamente 👍
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setUserConfirmed(false)}
                              className="border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-semibold gap-1.5 px-4 h-9"
                            >
                              <X className="w-4 h-4" /> No llegó ❌
                            </Button>
                          </div>
                        ) : userConfirmed === true ? (
                          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/30 flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-6 h-6 shrink-0" />
                            <div className="text-xs">
                              <p className="font-extrabold text-sm">¡Excelente! Configuración Completada</p>
                              <p className="mt-0.5">El sistema ya está completamente vinculado y validado. Listo para registrar gastos.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/30 space-y-3">
                            <div className="flex items-start gap-2.5 text-destructive dark:text-destructive-400">
                              <X className="w-5 h-5 shrink-0 mt-0.5" />
                              <div className="text-xs">
                                <p className="font-bold">El mensaje no apareció en WhatsApp</p>
                                <p className="mt-0.5">
                                  Aunque el sistema reportó éxito, puede que el bot no tenga los permisos de escritura en el grupo o que el JID del grupo sea incorrecto.
                                </p>
                              </div>
                            </div>
                            <div className="text-[11px] text-muted-foreground pl-7 space-y-1.5 list-disc list-inside">
                              <li>Verifica que el bot no haya sido silenciado en el grupo.</li>
                              <li>Asegúrate de que el bot sea administrador del grupo de WhatsApp.</li>
                              <li>Intenta desvincular y volver a vincular buscando el nombre del grupo.</li>
                            </div>
                            <div className="pl-7">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setTestState("idle");
                                  setUserConfirmed(null);
                                }}
                                className="text-xs px-3 h-8 gap-1.5"
                              >
                                Reintentar Envío
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {testState === "failed" && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 text-destructive dark:text-destructive-400 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <X className="w-5 h-5 shrink-0" />
                          <p className="text-xs font-bold">Falló el envío del mensaje</p>
                        </div>
                        <p className="text-xs text-muted-foreground pl-7">
                          Detalle del error: <span className="font-mono bg-destructive/10 px-1 py-0.5 rounded text-destructive">{testError}</span>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTestState("idle")}
                        className="text-xs gap-1.5"
                      >
                        Reintentar
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
