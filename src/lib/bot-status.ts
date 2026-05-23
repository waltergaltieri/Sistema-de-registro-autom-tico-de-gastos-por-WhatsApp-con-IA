export type BotConnectionTone = "success" | "warning" | "danger";

export interface BotConnectionView {
  tone: BotConnectionTone;
  label: string;
  title: string;
  description: string;
  actionLabel: string;
}

export interface BotLinkingView {
  tone: BotConnectionTone;
  isWaiting: boolean;
  title: string;
  description: string;
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

export function getBotLinkingView(
  status: string,
  qrCode: string | null
): BotLinkingView {
  if (status === "conectado") {
    return {
      tone: "success",
      isWaiting: false,
      title: "Dispositivo vinculado",
      description: "El bot esta conectado y listo para registrar comprobantes.",
    };
  }

  if (status === "esperando_vinculacion") {
    if (qrCode) {
      return {
        tone: "warning",
        isWaiting: false,
        title: "Escanea el codigo QR",
        description:
          "Abrí WhatsApp, entrá a Dispositivos vinculados y escaneá este código.",
      };
    }

    return {
      tone: "warning",
      isWaiting: true,
      title: "Esperando codigo QR",
      description:
        "El proceso del bot esta iniciando WhatsApp. El codigo deberia aparecer en unos segundos.",
    };
  }

  return {
    tone: "danger",
    isWaiting: false,
    title: "Bot de WhatsApp apagado",
    description: "El QR aparece cuando el proceso bot-whatsapp esta corriendo.",
  };
}
