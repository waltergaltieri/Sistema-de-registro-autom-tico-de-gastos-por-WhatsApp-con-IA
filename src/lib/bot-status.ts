export type BotConnectionTone = "success" | "warning" | "danger";

export interface BotConnectionView {
  tone: BotConnectionTone;
  label: string;
  title: string;
  description: string;
  actionLabel: string;
}

export function getBotConnectionView(status: string): BotConnectionView {
  if (status === "conectado") {
    return {
      tone: "success",
      label: "En linea",
      title: "WhatsApp vinculado",
      description:
        "La sesion del bot esta activa. Ya puede escuchar comprobantes en el grupo configurado.",
      actionLabel: "Cambiar numero",
    };
  }

  if (status === "esperando_vinculacion") {
    return {
      tone: "warning",
      label: "QR pendiente",
      title: "Escanear QR de WhatsApp",
      description:
        "El bot genero un codigo QR. Escanealo desde WhatsApp para vincular el numero.",
      actionLabel: "Escanear QR",
    };
  }

  return {
    tone: "danger",
    label: "Desconectado",
    title: "Vincular numero de WhatsApp",
    description:
      "El bot todavia no tiene una sesion activa. Abri la vinculacion y mantenela visible hasta que aparezca el QR.",
    actionLabel: "Abrir vinculacion",
  };
}
