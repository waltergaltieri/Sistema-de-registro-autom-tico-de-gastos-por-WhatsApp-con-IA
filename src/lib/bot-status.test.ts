import { describe, expect, it } from "vitest";
import { getBotConnectionView, getBotLinkingView } from "./bot-status";

describe("getBotConnectionView", () => {
  it("marks a connected bot as ready", () => {
    expect(getBotConnectionView("conectado")).toMatchObject({
      tone: "success",
      label: "En linea",
      actionLabel: "Cambiar numero",
    });
  });

  it("marks a bot waiting for QR as requiring a scan", () => {
    expect(getBotConnectionView("esperando_vinculacion")).toMatchObject({
      tone: "warning",
      label: "QR pendiente",
      actionLabel: "Escanear QR",
    });
  });

  it("marks unknown or disconnected states as requiring startup", () => {
    expect(getBotConnectionView("desconectado")).toMatchObject({
      tone: "danger",
      label: "Desconectado",
      actionLabel: "Abrir vinculacion",
    });

    expect(getBotConnectionView("otro")).toMatchObject({
      tone: "danger",
      label: "Desconectado",
    });
  });
});

describe("getBotLinkingView", () => {
  it("does not present disconnected as a loading state", () => {
    expect(getBotLinkingView("desconectado", null)).toMatchObject({
      isWaiting: false,
      title: "Bot de WhatsApp apagado",
      description: "El QR aparece cuando el proceso bot-whatsapp esta corriendo.",
    });
  });

  it("shows QR scan instructions only when the QR is available", () => {
    expect(getBotLinkingView("esperando_vinculacion", "data:image/png;base64,abc")).toMatchObject({
      isWaiting: false,
      title: "Escanea el codigo QR",
    });

    expect(getBotLinkingView("esperando_vinculacion", null)).toMatchObject({
      isWaiting: true,
      title: "Esperando codigo QR",
    });
  });
});
