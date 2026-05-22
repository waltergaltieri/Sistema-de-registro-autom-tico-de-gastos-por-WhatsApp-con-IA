require("dotenv").config();
const { create } = require("@open-wa/wa-automate");

const API_URL = process.env.PROCESSING_API_URL;
const WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET;

async function syncGroups(client) {
  try {
    console.log("🔄 Sincronizando grupos de WhatsApp...");
    const chats = await client.getAllGroups();
    const groups = [];

    for (const chat of chats) {
      try {
        const participants = await client.getGroupMembers(chat.id);
        groups.push({
          id: chat.id,
          name: chat.name || chat.formattedTitle || "Grupo sin nombre",
          is_active: true,
          member_count: participants.length,
          participants: participants.map((p) => ({
            phone: p.id.replace("@c.us", ""),
            pushname: p.pushname || p.name || p.formattedName || "Sin nombre",
          })),
        });
      } catch (chatError) {
        console.error(`❌ Error obteniendo miembros para el grupo ${chat.id}:`, chatError.message);
      }
    }

    const response = await sendToBackend("/api/bot/sync-groups", { groups });
    if (response?.ok) {
      console.log(`✅ Sincronizados ${groups.length} grupos con el backend.`);
    } else {
      console.error("❌ Falló la sincronización de grupos con el backend:", response);
    }
  } catch (error) {
    console.error("❌ Error en syncGroups:", error);
  }
}

async function checkPendingCommands(client) {
  try {
    const response = await sendToBackend("/api/bot/commands", { action: "poll" });
    if (response?.ok && response.commands && response.commands.length > 0) {
      for (const cmd of response.commands) {
        console.log(`🤖 Ejecutando comando recibido: ${cmd.command} (ID: ${cmd.id})`);
        
        try {
          if (cmd.command === "send_test_message") {
            const { chat_id, message_text } = cmd.payload;
            if (!chat_id || !message_text) {
              throw new Error("Faltan parámetros chat_id o message_text en el payload");
            }
            
            await client.sendText(chat_id, message_text);
            console.log(`✅ Mensaje de prueba enviado a ${chat_id}`);
            
            await sendToBackend("/api/bot/commands", {
              action: "resolve",
              command_id: cmd.id,
              status: "completed"
            });
          } else {
            throw new Error(`Comando no reconocido: ${cmd.command}`);
          }
        } catch (execError) {
          console.error(`❌ Error ejecutando comando ${cmd.id}:`, execError.message);
          
          await sendToBackend("/api/bot/commands", {
            action: "resolve",
            command_id: cmd.id,
            status: "failed",
            error_message: execError.message
          });
        }
      }
    }
  } catch (error) {
    console.error("❌ Error en checkPendingCommands:", error.message);
  }
}

async function start(client) {
  console.log("✅ Bot de Gastos Socios iniciado");
  console.log(`🌐 API URL: ${API_URL}`);

  // Notify backend that bot is connected
  await sendToBackend("/api/bot/qr-status", {
    status: "conectado"
  });

  // Listen to state changes
  client.onStateChanged(async (state) => {
    console.log(`🔄 Estado de la sesión cambiado a: ${state}`);
    if (state === "CONFLICT" || state === "UNLAUNCHED" || state === "UNPAIRED" || state === "DISCONNECTED") {
      await sendToBackend("/api/bot/qr-status", { status: "desconectado" });
    }
  });

  // 1. Initial synchronization
  await syncGroups(client);

  // 2. Set interval to sync groups every 10 minutes
  setInterval(async () => {
    await syncGroups(client);
  }, 10 * 60 * 1000);

  // 2b. Initial commands check and start polling loop
  await checkPendingCommands(client);
  setInterval(async () => {
    await checkPendingCommands(client);
  }, 4000);

  // 3. Listen to being added to groups
  client.onAddedToGroup(async (chat) => {
    console.log(`➕ Bot añadido al grupo: ${chat.name || chat.id}`);
    await syncGroups(client);
  });

  // 4. Message handler
  client.onMessage(async (message) => {
    try {
      // Only process messages from groups
      if (!message.chatId.endsWith("@g.us")) return;

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
        `📷 Comprobante recibido de ${message.sender.pushname} (${message.mimetype}) en grupo ${message.chatId}`
      );

      // Download the media
      const mediaData = await client.decryptFile(message);
      if (!mediaData) {
        console.error("❌ No se pudo descargar el archivo");
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

      // Reply in group (only if response.reply_text is provided and not null)
      if (response?.reply_text) {
        await client.sendText(message.chatId, response.reply_text);
      }

      if (response?.expense_id) {
        console.log(`✅ Gasto #${response.expense_id} registrado`);
      }
    } catch (error) {
      console.error("❌ Error procesando mensaje:", error);
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
      // If the group is not authorized (403), return silently so we don't spam
      if (response.status === 403) {
        return { ok: false, error: "Group not authorized", reply_text: null };
      }
    }

    return data;
  } catch (error) {
    console.error("❌ Error comunicando con backend:", error.message);
    return { ok: false, reply_text: null };
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
  qrCallback: async (qrCodeDataUrl) => {
    console.log("📲 Nuevo código QR de WhatsApp generado. Enviando al backend...");
    await sendToBackend("/api/bot/qr-status", {
      status: "esperando_vinculacion",
      qr_code: qrCodeDataUrl
    });
  }
})
  .then((client) => start(client))
  .catch(async (err) => {
    console.error("❌ Error iniciando OpenWA:", err);
    try {
      await sendToBackend("/api/bot/qr-status", { status: "desconectado" });
    } catch (e) {
      console.error("❌ Error al notificar desconexión:", e.message);
    }
    process.exit(1);
  });

