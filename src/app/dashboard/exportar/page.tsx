"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Download, FileSpreadsheet, Filter, Calendar, Users, Tags, CheckCircle2 } from "lucide-react";

export default function ExportarPage() {
  const [exporting, setExporting] = useState(false);

  function handleExport() {
    setExporting(true);
    // Simulated export
    setTimeout(() => {
      setExporting(false);
      // In production, this would trigger a CSV download
      alert("Exportación CSV generada (demo). En producción se descargará el archivo.");
    }, 1500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Exportar</h1>
        <p className="text-muted-foreground mt-1">
          Descargá tus gastos en formato CSV con filtros personalizados
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Config */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              Filtros de Exportación
            </CardTitle>
            <CardDescription>
              Configurá qué datos querés incluir en el archivo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Fecha desde
                </Label>
                <Input type="date" className="h-9" />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Fecha hasta
                </Label>
                <Input type="date" className="h-9" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                  <Users className="w-3.5 h-3.5" /> Socio
                </Label>
                <Select>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="walter">Walter</SelectItem>
                    <SelectItem value="marlon">Marlon</SelectItem>
                    <SelectItem value="ana">Ana</SelectItem>
                    <SelectItem value="lucia">Lucía</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                  <Tags className="w-3.5 h-3.5" /> Categoría
                </Label>
                <Select>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="materiales">Materiales</SelectItem>
                    <SelectItem value="obra">Obra / remodelación</SelectItem>
                    <SelectItem value="alquiler">Alquiler / seña</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Estado
                </Label>
                <Select>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="reviewed">Revisado</SelectItem>
                    <SelectItem value="corrected">Corregido</SelectItem>
                    <SelectItem value="rejected">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <Button
              className="w-full sm:w-auto gap-2 shadow-md shadow-primary/20"
              onClick={handleExport}
              disabled={exporting}
            >
              <Download className="w-4 h-4" />
              {exporting ? "Generando archivo..." : "Exportar CSV"}
            </Button>
          </CardContent>
        </Card>

        {/* Info card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              Formato del Archivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Badge variant="secondary" className="text-xs mb-3">CSV (UTF-8)</Badge>
              <p className="text-sm text-muted-foreground">
                El archivo incluirá las siguientes columnas:
              </p>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              {[
                "ID", "Fecha del gasto", "Fecha de carga", "Socio",
                "Proveedor", "Categoría", "Descripción", "Monto",
                "Moneda", "Método de pago", "Estado", "Confianza IA",
              ].map((col) => (
                <li key={col} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary shrink-0" />
                  {col}
                </li>
              ))}
            </ul>
            <Separator />
            <p className="text-xs text-muted-foreground">
              💡 Podés abrir el CSV en Excel, Google Sheets o cualquier herramienta de planillas.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
