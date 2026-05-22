"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Image,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { formatDateTime } from "@/lib/format";

interface LogEntry {
  id: string;
  created_at: string;
  sender_phone: string | null;
  sender_name: string | null;
  message_type: string | null;
  processing_status: "received" | "processed" | "failed" | "ignored";
  error_message: string | null;
  has_media: boolean;
  message_text: string | null;
}

const statusConfig = {
  received: { label: "Recibido", icon: Clock, color: "text-muted-foreground", bg: "bg-muted" },
  processed: { label: "Procesado", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  failed: { label: "Error", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  ignored: { label: "Ignorado", icon: AlertCircle, color: "text-warning", bg: "bg-warning/10" },
};

const typeIcons = {
  image: Image,
  document: FileText,
  text: MessageSquare,
};

export default function LogsPage() {
  const supabase = createClient();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load User Profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("users_profile")
            .select("*")
            .eq("auth_user_id", user.id)
            .maybeSingle();
          if (profile) {
            setUserProfile(profile);
          }
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
        setError("Error al cargar perfil de usuario.");
      }
    }
    loadProfile();
  }, [supabase]);

  // Fetch logs
  const fetchLogs = async (isManual = false) => {
    if (!userProfile?.organization_id) return;
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const { data, error: logsError } = await supabase
        .from("bot_message_logs")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      setLogs(data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching bot logs:", err);
      setError("No se pudieron cargar los logs de mensajería.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchLogs();
    }
  }, [userProfile]);

  // Statistics calculated dynamically from loaded entries
  const totalCount = logs.length;
  const processedCount = logs.filter((l) => l.processing_status === "processed").length;
  const errorCount = logs.filter((l) => l.processing_status === "failed").length;
  const ignoredCount = logs.filter((l) => l.processing_status === "ignored").length;

  // Filter logs for table rendering
  const filteredLogs = logs.filter((log) => {
    if (filterStatus === "all") return true;
    return log.processing_status === filterStatus;
  });

  if (loading && logs.length === 0) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando historial del bot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Logs del Bot</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Historial de mensajes procesados por el bot de WhatsApp (últimos 100)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shadow-sm shrink-0"
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refrescar
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border border-border/60">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{totalCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Total mensajes</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border border-border/60">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{processedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Procesados</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border border-border/60">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{errorCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Errores</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border border-border/60">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">{ignoredCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Ignorados</p>
          </CardContent>
        </Card>
      </div>

      {/* Log Table */}
      <Card className="shadow-sm overflow-hidden border border-border/60">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold text-sm">Mensajes Recientes</h3>
            <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val || "all")}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="processed">Procesados</SelectItem>
                <SelectItem value="failed">Errores</SelectItem>
                <SelectItem value="ignored">Ignorados</SelectItem>
                <SelectItem value="received">Recibidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <div className="overflow-x-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No se encontraron registros de logs para el filtro seleccionado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[150px]">Fecha</TableHead>
                  <TableHead className="w-[200px]">Remitente</TableHead>
                  <TableHead className="w-[120px]">Tipo</TableHead>
                  <TableHead>Mensaje</TableHead>
                  <TableHead className="w-[120px]">Estado</TableHead>
                  <TableHead className="max-w-[200px]">Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const status = statusConfig[log.processing_status] || statusConfig.received;
                  const StatusIcon = status.icon;
                  const TypeIcon = typeIcons[log.message_type as keyof typeof typeIcons] || MessageSquare;
                  
                  return (
                    <TableRow key={log.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {formatDateTime(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{log.sender_name || "Desconocido"}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{log.sender_phone || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <TypeIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs capitalize">{log.message_type || "texto"}</span>
                          {log.has_media && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 font-normal">Media</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">
                        {log.message_text || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`gap-1 text-[10px] ${status.bg} ${status.color} border-0 font-medium py-0.5 px-2`}>
                          <StatusIcon className="w-3 h-3 shrink-0" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px] truncate" title={log.error_message || ""}>
                        {log.error_message || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
