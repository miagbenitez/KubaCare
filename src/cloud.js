'use strict';

require('dotenv').config();

const express = require('express');
const { handleMessage } = require('./conversation');
const { extractMessages, parseAllowedNumbers } = require('./cloud-utils');

const TOKEN = process.env.META_ACCESS_TOKEN;
const PHONE_ID = process.env.META_PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const API_VERSION = process.env.META_API_VERSION || 'v21.0';
const PORT = Number(process.env.PORT) || 3000;
const DRY_RUN = process.env.DRY_RUN === 'true';
const ALLOWED_NUMBERS = parseAllowedNumbers(process.env.ALLOWED_NUMBERS);

if (!TOKEN || !PHONE_ID || !VERIFY_TOKEN) {
  console.error('❌ Faltan datos en .env. Copiá .env.example a .env y completá:');
  console.error('   META_ACCESS_TOKEN, META_PHONE_NUMBER_ID y META_VERIFY_TOKEN.');
  process.exit(1);
}

const sessions = new Map();
const processedIds = new Set();

const app = express();
app.use(express.json());

// Meta valida el webhook con un GET antes de guardarlo.
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verificado correctamente por Meta.');
    return res.status(200).send(challenge);
  }

  console.warn('⚠️ Intento de verificación rechazado (token incorrecto).');
  return res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  // Meta espera una respuesta rápida: procesamos después.
  res.sendStatus(200);

  try {
    for (const message of extractMessages(req.body)) {
      await processMessage(message);
    }
  } catch (error) {
    console.error('Error al procesar el webhook:', error);
  }
});

async function processMessage(message) {
  if (processedIds.has(message.id)) return; // Meta puede reenviar el mismo mensaje
  processedIds.add(message.id);

  if (ALLOWED_NUMBERS.size && !ALLOWED_NUMBERS.has(message.from)) {
    console.log(`🚫 Ignorado (no está en ALLOWED_NUMBERS): ${message.from}`);
    return;
  }

  if (message.type !== 'text' || !message.text) {
    await sendText(message.from, '🤔 Por ahora solo entiendo mensajes de texto. ¿Querés ver el catálogo?');
    return;
  }

  const { session, replies } = handleMessage(sessions.get(message.from), message.text);
  sessions.set(message.from, session);

  for (const reply of replies) {
    await sendText(message.from, reply);
  }
}

async function sendText(to, body) {
  if (DRY_RUN) {
    console.log(`\n📝 [MODO PRUEBA] Respuesta para ${to}:\n${body}\n`);
    return;
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_ID}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body, preview_url: false },
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('❌ Error de la API de Meta:', response.status, JSON.stringify(data));
    throw new Error(data?.error?.message || `HTTP ${response.status}`);
  }

  console.log(`✅ Enviado a ${to} (id ${data.messages?.[0]?.id || '?'})`);
}

app.listen(PORT, () => {
  console.log(`🚀 Webhook de KubaCare escuchando en http://localhost:${PORT}/webhook`);
  console.log(`📞 Respondiendo desde el Phone Number ID ${PHONE_ID}`);
  if (DRY_RUN) console.log('🔇 Modo prueba: NO se envían mensajes reales.\n');
});
