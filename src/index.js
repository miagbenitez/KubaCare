'use strict';

const path = require('node:path');
const os = require('node:os');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { handleMessage } = require('./conversation');
const config = require('../config');

// Estado de cada conversación, identificado por el número de WhatsApp del cliente.
// Se guarda en memoria: al reiniciar el proceso las conversaciones se reinician.
const sessions = new Map();

// Solo estos chats pueden recibir respuestas. Si la lista está vacía, ninguno.
const allowedChats = new Set(
  config.allowedNumbers
    .map((number) => String(number).replace(/\D/g, ''))
    .filter(Boolean)
    .map((number) => `${number}@c.us`),
);

function isSystemChat(from = '') {
  return (
    from.endsWith('@g.us') ||
    from.endsWith('@newsletter') ||
    from === 'status@broadcast'
  );
}

function isAllowedChat(message) {
  const from = message.from || '';
  return (
    !message.fromMe &&
    !message.isGroupMsg &&
    !isSystemChat(from) &&
    allowedChats.has(from)
  );
}

// La sesión se guarda FUERA del proyecto: si el repo está en OneDrive/Dropbox,
// el sync bloquea el lockfile de Chromium y el bot falla con EBUSY.
const authPath = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, 'KubaCare', 'wwebjs_auth')
  : path.join(os.homedir(), '.kubacare', 'wwebjs_auth');

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: authPath }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  },
});

client.on('loading_screen', (percent, message) => {
  if (percent === '100') return;
  console.log(`Iniciando WhatsApp... ${percent}% ${message || ''}`);
});

client.on('qr', (qr) => {
  console.log('\n📱 Escaneá este código QR con WhatsApp → Dispositivos vinculados\n');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('🔐 Sesión autenticada y guardada.');
});

client.on('auth_failure', (message) => {
  console.error('❌ Error de autenticación:', message);
});

client.on('ready', () => {
  if (config.dryRun || allowedChats.size === 0) {
    console.log('🔇 KubaCare Bot conectado en MODO SEGURO: no va a enviar mensajes a nadie.');
    console.log('   Para habilitarlo, editá config.js (allowedNumbers y dryRun).\n');
  } else {
    console.log(`✅ KubaCare Bot conectado. Atiende solo ${allowedChats.size} número(s) permitido(s).\n`);
  }
});

client.on('disconnected', (reason) => {
  console.warn('⚠️ Bot desconectado:', reason);
});

client.on('message', async (message) => {
  if (message.fromMe) return;

  if (!isAllowedChat(message)) {
    if (!isSystemChat(message.from)) {
      console.log(`🚫 Ignorado (no está en allowedNumbers): ${message.from}`);
    }
    return;
  }

  try {
    const previous = sessions.get(message.from);
    const { session, replies } = handleMessage(previous, message.body);
    sessions.set(message.from, session);

    for (const reply of replies) {
      if (config.dryRun) {
        console.log(`\n📝 [MODO PRUEBA] Respuesta para ${message.from}:\n${reply}\n`);
      } else {
        await client.sendMessage(message.from, reply);
      }
    }
  } catch (error) {
    console.error('Error al procesar mensaje de', message.from, error);
    if (!config.dryRun) {
      try {
        await client.sendMessage(
          message.from,
          '😕 Hubo un problema técnico. Probá de nuevo en un momento.',
        );
      } catch (sendError) {
        console.error('No se pudo enviar el mensaje de error:', sendError);
      }
    }
  }
});

process.on('SIGINT', async () => {
  console.log('\nCerrando el bot...');
  await client.destroy();
  process.exit(0);
});

client.initialize();
