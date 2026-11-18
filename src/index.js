'use strict';

const path = require('node:path');
const os = require('node:os');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { handleMessage } = require('./conversation');

// Estado de cada conversación, identificado por el número de WhatsApp del cliente.
// Se guarda en memoria: al reiniciar el proceso las conversaciones se reinician.
const sessions = new Map();

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
  console.log('✅ KubaCare Bot conectado. Ya está atendiendo mensajes.\n');
});

client.on('disconnected', (reason) => {
  console.warn('⚠️ Bot desconectado:', reason);
});

client.on('message', async (message) => {
  if (message.fromMe || message.isGroupMsg) return;

  try {
    const previous = sessions.get(message.from);
    const { session, replies } = handleMessage(previous, message.body);
    sessions.set(message.from, session);

    for (const reply of replies) {
      await client.sendMessage(message.from, reply);
    }
  } catch (error) {
    console.error('Error al responder a', message.from, error);
    try {
      await client.sendMessage(
        message.from,
        '😕 Hubo un problema técnico. Probá de nuevo en un momento.',
      );
    } catch (sendError) {
      console.error('No se pudo enviar el mensaje de error:', sendError);
    }
  }
});

process.on('SIGINT', async () => {
  console.log('\nCerrando el bot...');
  await client.destroy();
  process.exit(0);
});

client.initialize();
