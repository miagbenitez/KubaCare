'use strict';

/** Extrae los mensajes de texto del payload que envía Meta al webhook. */
function extractMessages(body) {
  const messages = [];

  for (const entry of body?.entry || []) {
    for (const change of entry?.changes || []) {
      if (change?.field !== 'messages') continue;

      for (const message of change.value?.messages || []) {
        messages.push({
          id: message.id,
          from: message.from,
          type: message.type,
          text: message.text?.body || '',
          timestamp: message.timestamp,
        });
      }
    }
  }

  return messages;
}

/** Parsea la lista opcional de números permitidos del .env. */
function parseAllowedNumbers(value = '') {
  return new Set(
    String(value)
      .split(',')
      .map((number) => number.replace(/\D/g, '').trim())
      .filter(Boolean),
  );
}

module.exports = { extractMessages, parseAllowedNumbers };
