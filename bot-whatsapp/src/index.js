require("dotenv").config();

const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { Client, LocalAuth } = require("whatsapp-web.js");

const API_URL = process.env.PROCESSING_API_URL;
const WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET;
const SESSION_ID = process.env.OPENWA_SESSION_ID || "gastos-socios";

if (!API_URL || !WEBHOOK_SECRET) {
  console.error("Faltan PROCESSING_API_URL o BOT_WEBHOOK_SECRET en .env");
  process.exit(1);
}

function normalizePhone(id) {
  return (id || "").replace("@c.us", "").replace("@lid", "");
}

function getParticipantId(participant) {
  return participant?.id?._serialized || participant?.id?.user || participant?.id || "";
}

async function sendToBackend(routePath, body) {
  try {
    const url = `${API_URL}${routePath}`;
    console.log(`Enviando a ${url}...`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": WEBHOOK_SECRET,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(`API error ${response.status}:`, data);
      if (response.status === 403) {
        return { ok: false, error: "Group not authorized", reply_text: null };
      }
    }

    return data;
  } catch (error) {
    console.error("Error comunicando con backend:", error.message);
    return { ok: false, reply_text: null };
  }
}

async function syncGroups(client) {
  try {
    console.log("Sincronizando grupos de WhatsApp...");
    const chats = await client.getChats();
    const groups = chats
      .filter((chat) => chat.isGroup)
      .map((chat) => ({
        id: chat.id._serialized,
        name: chat.name || "Grupo sin nombre",
        is_active: true,
        member_count: chat.participants?.length || 0,
        participants: (chat.participants || []).map((participant) => ({
          phone: normalizePhone(getParticipantId(participant)),
          pushname: participant?.name || participant?.shortName || "Sin nombre",
        })),
      }));

    const response = await sendToBackend("/api/bot/sync-groups", { groups });
    if (response?.ok) {
      console.log(`Sincronizados ${groups.length} grupos con el backend.`);
    } else {
      console.error("Fallo la sincronizacion de grupos con el backend:", response);
    }
  } catch (error) {
    console.error("Error en syncGroups:", error);
  }
}

async function checkPendingCommands(client) {
  try {
    const response = await sendToBackend("/api/bot/commands", { action: "poll" });
    if (!response?.ok || !response.commands?.length) return;

    for (const cmd of response.commands) {
      console.log(`Ejecutando comando recibido: ${cmd.command} (ID: ${cmd.id})`);

      try {
        if (cmd.command === "send_test_message") {
          const { chat_id: chatId, message_text: messageText } = cmd.payload;
          if (!chatId || !messageText) {
            throw new Error("Faltan parametros chat_id o message_text en el payload");
          }

          await client.sendMessage(chatId, messageText);
          await sendToBackend("/api/bot/commands", {
            action: "resolve",
            command_id: cmd.id,
            status: "completed",
          });
          continue;
        }

        if (cmd.command === "logout_whatsapp") {
          await sendToBackend("/api/bot/commands", {
            action: "resolve",
            command_id: cmd.id,
            status: "completed",
          });
          await sendToBackend("/api/bot/qr-status", { status: "desconectado" });
          await client.logout();
          fs.rmSync(path.join(process.cwd(), ".wwebjs_auth"), {
            recursive: true,
            force: true,
          });
          process.exit(0);
        }

        throw new Error(`Comando no reconocido: ${cmd.command}`);
      } catch (execError) {
        console.error(`Error ejecutando comando ${cmd.id}:`, execError.message);
        await sendToBackend("/api/bot/commands", {
          action: "resolve",
          command_id: cmd.id,
          status: "failed",
          error_message: execError.message,
        });
      }
    }
  } catch (error) {
    console.error("Error en checkPendingCommands:", error.message);
  }
}

async function handleMessage(client, message) {
  try {
    const chat = await message.getChat();
    if (!chat.isGroup) return;

    const contact = await message.getContact();
    const messageText = message.body || "";
    const senderId = message.author || contact.id?._serialized || "";
    const senderName =
      contact.pushname || contact.name || contact.shortName || "Desconocido";

    const isCommand =
      messageText.startsWith("/gastos") || messageText.startsWith("/gasto");

    if (isCommand) {
      console.log(`Comando recibido de ${senderName}: ${messageText}`);
      const response = await sendToBackend("/api/bot/query", {
        chat_id: chat.id._serialized,
        sender_phone: normalizePhone(senderId),
        sender_name: senderName,
        message_text: messageText,
      });

      if (response?.reply_text) {
        await message.reply(response.reply_text);
      }
      return;
    }

    if (!message.hasMedia) return;

    const media = await message.downloadMedia();
    if (!media?.data || !media.mimetype) {
      console.error("No se pudo descargar el archivo");
      return;
    }

    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedMimeTypes.some((type) => media.mimetype.startsWith(type))) {
      console.log(`Ignorando archivo de tipo: ${media.mimetype}`);
      return;
    }

    const mediaBytes = Buffer.byteLength(media.data, "base64");
    const maxSize = media.mimetype.includes("pdf")
      ? 15 * 1024 * 1024
      : 10 * 1024 * 1024;

    if (mediaBytes > maxSize) {
      await message.reply(
        "El archivo es demasiado grande. Maximo 10MB para imagenes y 15MB para PDFs."
      );
      return;
    }

    console.log(
      `Comprobante recibido de ${senderName} (${media.mimetype}) en grupo ${chat.id._serialized}`
    );

    const response = await sendToBackend("/api/bot/incoming-message", {
      message_id: message.id._serialized,
      chat_id: chat.id._serialized,
      sender_phone: normalizePhone(senderId),
      sender_name: senderName,
      message_text: messageText,
      sent_at: new Date(message.timestamp * 1000).toISOString(),
      has_media: true,
      media: {
        mime_type: media.mimetype,
        filename:
          media.filename ||
          `receipt.${media.mimetype.split("/")[1]?.replace("jpeg", "jpg") || "jpg"}`,
        base64: media.data,
      },
    });

    if (response?.reply_text) {
      await message.reply(response.reply_text);
    }

    if (response?.expense_id) {
      console.log(`Gasto #${response.expense_id} registrado`);
    }
  } catch (error) {
    console.error("Error procesando mensaje:", error);
  }
}

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: SESSION_ID,
    dataPath: path.join(process.cwd(), ".wwebjs_auth"),
  }),
  puppeteer: {
    headless: true,
    executablePath: process.env.CHROME_BIN || "/usr/bin/chromium-browser",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  },
});

client.on("qr", async (qr) => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(qr);
    console.log("Nuevo codigo QR generado. Enviando al backend...");
    await sendToBackend("/api/bot/qr-status", {
      status: "esperando_vinculacion",
      qr_code: qrCodeDataUrl,
    });
  } catch (error) {
    console.error("Error generando QR:", error.message);
  }
});

client.on("authenticated", async () => {
  console.log("WhatsApp autenticado.");
  await sendToBackend("/api/bot/qr-status", { status: "conectado" });
});

client.on("ready", async () => {
  console.log("Bot de Gastos Socios iniciado");
  console.log(`API URL: ${API_URL}`);
  await sendToBackend("/api/bot/qr-status", { status: "conectado" });
  await syncGroups(client);
  await checkPendingCommands(client);

  setInterval(() => syncGroups(client), 10 * 60 * 1000);
  setInterval(() => checkPendingCommands(client), 4000);
});

client.on("group_join", () => {
  syncGroups(client);
});

client.on("message", (message) => {
  handleMessage(client, message);
});

client.on("disconnected", async (reason) => {
  console.warn("WhatsApp desconectado:", reason);
  await sendToBackend("/api/bot/qr-status", { status: "desconectado" });
});

client.on("auth_failure", async (message) => {
  console.error("Fallo de autenticacion:", message);
  await sendToBackend("/api/bot/qr-status", { status: "desconectado" });
});

client.initialize().catch(async (error) => {
  console.error("Error iniciando WhatsApp:", error);
  await sendToBackend("/api/bot/qr-status", { status: "desconectado" });
  process.exit(1);
});
