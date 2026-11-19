'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { extractMessages, parseAllowedNumbers } = require('../src/cloud-utils');

function webhookPayload(messages) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'ENTRY_ID',
        changes: [{ field: 'messages', value: { messages } }],
      },
    ],
  };
}

test('extrae mensajes de texto del webhook de Meta', () => {
  const messages = extractMessages(
    webhookPayload([{ id: 'wamid.1', from: '5491123456789', type: 'text', text: { body: 'hola' } }]),
  );

  assert.equal(messages.length, 1);
  assert.equal(messages[0].from, '5491123456789');
  assert.equal(messages[0].text, 'hola');
});

test('ignora cambios que no son de mensajes', () => {
  const body = { entry: [{ changes: [{ field: 'statuses', value: {} }] }] };
  assert.deepEqual(extractMessages(body), []);
});

test('incluye tipos no texto para poder responder amablemente', () => {
  const messages = extractMessages(
    webhookPayload([{ id: 'wamid.2', from: '5491123456789', type: 'image' }]),
  );

  assert.equal(messages[0].type, 'image');
  assert.equal(messages[0].text, '');
});

test('parsea los números permitidos y los limpia', () => {
  const allowed = parseAllowedNumbers('5491123456789, +54 9 11 2222-3333');
  assert.deepEqual([...allowed], ['5491123456789', '5491122223333']);
});

test('lista vacía de números permitidos', () => {
  assert.equal(parseAllowedNumbers('').size, 0);
});
