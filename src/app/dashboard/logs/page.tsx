"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { AlertCircle, CheckCircle2, XCircle, Clock, MessageSquare, Image, FileText } from "lucide-react";
import { formatDateTime } from "@/lib/format";

interface LogEntry {
  id: string;
  created_at: string;
  sender_phone: string;
  sender_name: string;
  message_type: string;
  processing_status: "received" | "processed" | "failed" | "ignored";
  error_message: string | null;
  has_media: boolean;
  message_text: string | null;
}

const demoLogs: LogEntry[] = [
  {
    id: "1", created_at: "2026-05-21T18:30:00Z",
    sender_phone: "+5491112345678", sender_name: "Walter",
    message_type: "image", processing_status: "processed",
    error_message: null, has_media: true,
    message_text: "Compré pintura para el local",
  },
  {
    id: "2", created_at: "2026-05-21T17:45:00Z",
    sender_phone: "+5491187654321", sender_name: "Marlon",
    message_type: "text", processing_status: "ignored",
    error_message: null, has_media: false,
    message_text: "Dale, después lo vemos",
  },
  {
    id: "3", created_at: "2026-05-21T16:20:00Z",
    sender_phone: "+5491155556666", sender_name: "Ana",
    message_type: "image", processing_status: "processed",
    error_message: null, has_media: true,
    message_text: "Ticket del flete",
  },
  {
    id: "4", created_at: "2026-05-21T14:10:00Z",
    sender_phone: "+5491144443333", sender_name: "Lucía",
    message_type: "document", processing_status: "failed",
    error_message: "Gemini: Cannot parse document — corrupted PDF",
    has_media: true,
    message_text: null,
  },
  {
    id: "5", created_at: "2026-05-21T12:00:00Z",
    sender_phone: "+5491112345678", sender_name: "Walter",
    message_type: "image", processing_status: "processed",
    error_message: null, has_media: true,
    message_text: "Café de la reunión de ayer",
  },
  {
    id: "6", created_at: "2026-05-20T20:30:00Z",
    sender_phone: "+5491100009999", sender_name: "Desconocido",
    message_type: "image", processing_status: "failed",
    error_message: "Sender not registered in users_profile",
    has_media: true,
    message_text: null,
  },
];

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
  const errorCount = demoLogs.filter((l) => l.processing_status === "failed").length;
  const processedCount = demoLogs.filter((l) => l.processing_status === "processed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Logs del Bot</h1>
        <p className="text-muted-foreground mt-1">
          Historial de mensajes procesados por el bot de WhatsApp
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger-children">
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{demoLogs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total mensajes</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{processedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Procesados</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{errorCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Errores</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">
              {demoLogs.filter((l) => l.processing_status === "ignored").length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Ignorados</p>
          </CardContent>
        </Card>
      </div>

      {/* Log Table */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Mensajes Recientes</CardTitle>
            <Select defaultValue="all">
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="processed">Procesados</SelectItem>
                <SelectItem value="failed">Errores</SelectItem>
                <SelectItem value="ignored">Ignorados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Fecha</TableHead>
                <TableHead>Remitente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demoLogs.map((log) => {
                const status = statusConfig[log.processing_status];
                const StatusIcon = status.icon;
                const TypeIcon = typeIcons[log.message_type as keyof typeof typeIcons] || MessageSquare;
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{log.sender_name}</p>
                        <p className="text-[11px] text-muted-foreground">{log.sender_phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <TypeIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs capitalize">{log.message_type}</span>
                        {log.has_media && (
                          <Badge variant="secondary" className="text-[9px] px-1">Media</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {log.message_text || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`gap-1 text-[10px] ${status.bg} ${status.color} border-0`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-destructive max-w-[250px] truncate">
                      {log.error_message || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
