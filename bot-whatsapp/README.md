# OpenWA Bot Service — Gastos Socios

Servicio separado que corre OpenWA para escuchar el grupo de WhatsApp y enviar comprobantes al backend.

## ⚠️ Importante

Este servicio **NO debe correr en Vercel**. Necesita un proceso persistente:
- VPS económico
- Railway / Render / Fly.io
- Servidor local estable (para pruebas)

## Instalación

```bash
cd bot-whatsapp
npm install
```

## Configuración

Copiá `.env.example` a `.env` y completá las variables:

```bash
cp .env.example .env
```

## Ejecución

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

Al iniciar por primera vez, se abrirá un QR code en la terminal.
Escaneá el QR con WhatsApp Web para vincular la sesión.

## Flujo

1. El bot escucha mensajes del grupo autorizado
2. Si el mensaje tiene media (imagen/PDF), lo descarga
3. Envía el payload al endpoint `/api/bot/incoming-message`
4. Si el mensaje es un comando (`/gastos`, `/gasto`), lo envía a `/api/bot/query`
5. Responde en el grupo con el resultado

## Comandos soportados

- `/gastos total` — Total gastado
- `/gastos ultimos` — Últimos 5 gastos
- `/gastos categoria [nombre]` — Gastos por categoría
- `/gastos proveedor [nombre]` — Buscar por proveedor
- `/gasto [id]` — Detalle de un gasto
