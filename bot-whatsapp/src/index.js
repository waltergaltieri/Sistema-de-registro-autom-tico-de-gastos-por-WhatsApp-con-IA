require("dotenv").config();
const { create } = require("@open-wa/wa-automate");

const AUTHORIZED_GROUP_ID = process.env.AUTHORIZED_WHATSAPP_GROUP_ID;
const API_URL = process.env.PROCESSING_API_URL;
const WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET;

async function start(client) {
  console.log("✅ Bot de Gastos Socios iniciado");
  console.log(`📱 Grupo autorizado: ${AUTHORIZED_GROUP_ID}`);
  console.log(`🌐 API URL: ${API_URL}`);

  client.onMessage(async (message) => {
    try {
      // Only process messages from the authorized group
      if (message.chatId !== AUTHORIZED_GROUP_ID) return;

      const messageText = message.body || message.caption || "";

      // ==========================================
      // Handle query commands
      // ==========================================
      const isCommand =
        messageText.startsWith("/gastos") || messageText.startsWith("/gasto");

      if (isCommand) {
        console.log(`📩 Comando recibido de ${message.sender.pushname}: ${messageText}`);

        const response = await sendToBackend("/api/bot/query", {
          chat_id: message.chatId,
          sender_phone: message.sender.id.replace("@c.us", ""),
          sender_name: message.sender.pushname || "Desconocido",
          message_text: messageText,
        });

        if (response?.reply_text) {
          await client.sendText(message.chatId, response.reply_text);
        }
        return;
      }

      // ==========================================
      // Handle media messages (expense receipts)
      // ==========================================
      if (!message.isMedia && !message.mimetype) {
        // Ignore text-only messages that aren't commands
        return;
      }

      // Ignore stickers, audio, video
      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];

      if (!allowedMimeTypes.some((t) => message.mimetype?.startsWith(t))) {
        console.log(`⏭️ Ignorando archivo de tipo: ${message.mimetype}`);
        return;
      }

      console.log(
        `📷 Comprobante recibido de ${message.sender.pushname} (${message.mimetype})`
      );

      // Download the media
      const mediaData = await client.decryptFile(message);
      if (!mediaData) {
        console.error("❌ No se pudo descargar el archivo");
        await client.sendText(
          message.chatId,
          "⚠️ No pude descargar el archivo. Intentá enviarlo de nuevo."
        );
        return;
      }

      // Check file size (10MB max for images, 15MB for PDFs)
      const maxSize = message.mimetype?.includes("pdf")
        ? 15 * 1024 * 1024
        : 10 * 1024 * 1024;

      if (mediaData.length > maxSize) {
        await client.sendText(
          message.chatId,
          "⚠️ El archivo es demasiado grande. Máximo 10MB para imágenes y 15MB para PDFs."
        );
        return;
      }

      // Convert to base64
      const base64 = Buffer.from(mediaData).toString("base64");

      // Build payload
      const payload = {
        message_id: message.id,
        chat_id: message.chatId,
        sender_phone: message.sender.id.replace("@c.us", ""),
        sender_name: message.sender.pushname || "Desconocido",
        message_text: messageText,
        sent_at: new Date(message.timestamp * 1000).toISOString(),
        has_media: true,
        media: {
          mime_type: message.mimetype,
          filename: message.filename || `receipt.${message.mimetype?.split("/")[1] || "jpg"}`,
          base64: base64,
        },
      };

      // Send to backend
      const response = await sendToBackend(
        "/api/bot/incoming-message",
        payload
      );

      // Reply in group
      if (response?.reply_text) {
        await client.sendText(message.chatId, response.reply_text);
      }

      if (response?.expense_id) {
        console.log(`✅ Gasto #${response.expense_id} registrado`);
      }
    } catch (error) {
      console.error("❌ Error procesando mensaje:", error);
      try {
        await client.sendText(
          message.chatId,
          "⚠️ No pude procesar el comprobante. Revisalo desde el dashboard o volvé a enviarlo."
        );
      } catch (replyError) {
        console.error("❌ Error enviando respuesta:", replyError);
      }
    }
  });
}

/**
 * Send a request to the backend API
 */
async function sendToBackend(path, body) {
  try {
    const url = `${API_URL}${path}`;
    console.log(`🔄 Enviando a ${url}...`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": WEBHOOK_SECRET,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ API error ${response.status}:`, data);
    }

    return data;
  } catch (error) {
    console.error("❌ Error comunicando con backend:", error.message);
    return { ok: false, reply_text: "⚠️ Error de conexión con el servidor." };
  }
}

// ==========================================
// Initialize OpenWA
// ==========================================

create({
  sessionId: process.env.OPENWA_SESSION_ID || "gastos-socios",
  multiDevice: true,
  authTimeout: 60,
  blockCrashLogs: true,
  disableSpins: true,
  headless: true,
  logConsole: false,
  popup: true,
  qrTimeout: 0,
})
  .then((client) => start(client))
  .catch((err) => {
    console.error("❌ Error iniciando OpenWA:", err);
    process.exit(1);
  });
