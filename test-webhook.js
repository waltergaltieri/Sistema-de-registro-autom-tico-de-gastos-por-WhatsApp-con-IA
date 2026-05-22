/**
 * Script de prueba para simular el envío de un comprobante desde el Bot a Next.js.
 * 
 * Uso:
 * 1. Asegurate de tener configurado tu archivo .env.local en Next.js.
 * 2. Iniciá el servidor de Next.js: npm run dev
 * 3. En otra terminal, ejecutá: node test-webhook.js
 */

const http = require('http');

// Configuración de prueba
const NEXT_URL = 'http://localhost:3000';
const WEBHOOK_SECRET = 'mi-webhook-secret-seguro'; // Reemplazar por tu BOT_WEBHOOK_SECRET
const CHAT_ID = '12036302482394@g.us'; // ID de grupo simulado

// Una imagen de 1x1 pixel roja en Base64 para simular un comprobante
const dummyBase64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const payload = {
  message_id: `false_${CHAT_ID}_ABC123XYZ`,
  chat_id: CHAT_ID,
  sender_phone: '5491112345678',
  sender_name: 'Walter Test',
  message_text: 'Pintura y materiales para el local. Pagado con débito.',
  sent_at: new Date().toISOString(),
  has_media: true,
  media: {
    mime_type: 'image/png',
    filename: 'comprobante_test.png',
    base64: dummyBase64Image
  }
};

const payloadString = JSON.stringify(payload);

console.log('🔄 Enviando payload simulado al endpoint de Next.js...');
console.log(`URL: ${NEXT_URL}/api/bot/incoming-message`);

const req = http.request(
  `${NEXT_URL}/api/bot/incoming-message`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': WEBHOOK_SECRET,
      'Content-Length': Buffer.byteLength(payloadString)
    }
  },
  (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log(`\n📬 Respuesta del servidor (Status: ${res.statusCode}):`);
      try {
        const parsed = JSON.parse(responseData);
        console.log(JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log(responseData);
      }
    });
  }
);

req.on('error', (e) => {
  console.error(`❌ Error en la conexión: ${e.message}`);
  console.log('¿Está Next.js corriendo localmente en el puerto 3000?');
});

req.write(payloadString);
req.end();
