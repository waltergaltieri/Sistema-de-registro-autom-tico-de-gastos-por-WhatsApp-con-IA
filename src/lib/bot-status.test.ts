import { describe, expect, it } from "vitest";
import { getBotConnectionView } from "./bot-status";

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
