"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBotLinkingView } from "@/lib/bot-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, QrCode, Smartphone, RefreshCw, PowerOff, ArrowLeft } from "lucide-react";

export default function VincularPage() {
  const [status, setStatus] = useState<string>("desconectado");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const linkingView = getBotLinkingView(status, qrCode);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/bot/status");
        if (!res.ok) {
          throw new Error("Error al consultar el estado del bot");
        }
        const data = await res.json();
        if (data.ok) {
          setStatus(data.status);
          setQrCode(data.qr_code);
          setLastUpdated(data.updated_at);
          setError(null);
        } else {
          setError(data.error || "Error desconocido");
        }
      } catch (err) {
        console.error(err);
        setError("No se pudo conectar con el servidor.");
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every 3 seconds
    const intervalId = setInterval(fetchStatus, 3000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-chart-2/5 blur-3xl translate-y-1/2 -translate-x-1/3" />

      <div className="relative z-10 w-full max-w-md px-4 py-8">
        {/* Brand */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Vinculación de WhatsApp
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Sistema de Gastos Socios
          </p>
        </div>

        <Card className="shadow-2xl shadow-primary/5 border-border/50 backdrop-blur-md bg-card/90">
          <CardHeader className="text-center pb-2">
            {status === "conectado" ? (
              <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 text-green-500 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            ) : status === "esperando_vinculacion" && qrCode ? (
              <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary">
                <QrCode className="w-8 h-8" />
              </div>
            ) : status === "desconectado" ? (
              <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 text-destructive">
                <PowerOff className="w-8 h-8" />
              </div>
            ) : (
              <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary animate-spin">
                <Loader2 className="w-8 h-8" />
              </div>
            )}

            <CardTitle className="text-xl">
              {linkingView.title}
            </CardTitle>
            
            <CardDescription className="text-sm px-2">
              {linkingView.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center justify-center p-6">
            {loading ? (
              <div className="flex flex-col items-center gap-2 py-12">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Cargando estado...</span>
              </div>
            ) : error ? (
              <div className="w-full text-center py-6">
                <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">
                  {error}
                </div>
              </div>
            ) : (
              <>
                {status === "desconectado" && (
                  <div className="flex flex-col items-center gap-5 py-6 text-center">
                    <div className="w-full rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-left">
                      <p className="text-sm font-medium text-destructive">
                        No hay un proceso de WhatsApp activo generando el QR.
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Vercel aloja la app web, pero el bot de WhatsApp necesita correr como proceso persistente en un servidor, Render, Railway, Fly.io o una PC encendida.
                      </p>
                      <code className="mt-3 block rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                        cd bot-whatsapp && npm start
                      </code>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                        className="gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reintentar
                      </Button>
                      <Button
                        variant="secondary"
                        render={<Link href="/dashboard/grupos" />}
                        className="gap-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Volver a grupos
                      </Button>
                    </div>
                    {lastUpdated && (
                      <p className="text-xs text-muted-foreground">
                        Último estado recibido: {new Date(lastUpdated).toLocaleString("es-AR")}
                      </p>
                    )}
                  </div>
                )}

                {status === "esperando_vinculacion" && (
                  <div className="w-full flex flex-col items-center gap-6">
                    {qrCode ? (
                      <div className="relative p-4 bg-white rounded-2xl border shadow-inner animate-scale-in">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qrCode}
                          alt="WhatsApp QR Code"
                          className="w-64 h-64 select-none"
                        />
                        <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg">
                          <Smartphone className="w-4 h-4" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-16">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">{linkingView.description}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full border">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                      <span>Se actualiza automáticamente</span>
                    </div>
                  </div>
                )}

                {status === "conectado" && (
                  <div className="w-full flex flex-col items-center text-center py-6 space-y-4 animate-scale-in">
                    <div className="text-sm text-muted-foreground">
                      El bot de WhatsApp está conectado y registrando gastos activamente en tus grupos autorizados.
                    </div>
                    <div className="w-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 p-4 rounded-xl text-sm font-medium">
                      Conexión activa y configurada correctamente.
                    </div>
                    <Button
                      variant="secondary"
                      render={<Link href="/dashboard/grupos" />}
                      className="gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Volver a grupos
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
