'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  STEPS,
  createSession,
  handleMessage,
  calculateTotal,
  orderSummary,
} = require('../src/conversation');
const { PRODUCTS, formatPrice } = require('../src/catalog');

function talk(messages, initialSession = createSession()) {
  let session = initialSession;
  let replies = [];

  for (const message of messages) {
    const result = handleMessage(session, message);
    session = result.session;
    replies = result.replies;
  }

  return { session, replies, text: replies.join('\n') };
}

test('el primer contacto saluda, presenta el negocio y muestra el catálogo', () => {
  const { session, text } = talk(['hola']);

  assert.match(text, /KubaCare/);
  assert.match(text, /Sérum de Vitamina C/);
  assert.match(text, /Protector solar FPS 50/);
  assert.match(text, /Catálogo/);
  assert.equal(session.step, STEPS.CATALOG);
});

test('elegir un producto por número pide la cantidad', () => {
  const { session, text } = talk(['hola', '1']);

  assert.equal(session.selectedProductId, 1);
  assert.equal(session.step, STEPS.QUANTITY);
  assert.match(text, /unidades/i);
});

test('también se puede elegir un producto escribiendo su nombre', () => {
  const { session } = talk(['hola', 'rosa mosqueta']);

  assert.equal(session.selectedProductId, 6);
  assert.equal(session.step, STEPS.QUANTITY);
});

test('una respuesta fuera de contexto se maneja con amabilidad', () => {
  const { session, text } = talk(['hola', 'blablabla']);

  assert.match(text, /No entendí/);
  assert.equal(session.step, STEPS.CATALOG);
});

test('un número de producto inexistente da una pista al cliente', () => {
  const { text } = talk(['hola', '99']);

  assert.match(text, /No encontré el producto 99/);
});

test('el flujo completo calcula el total y confirma el pedido', () => {
  const { session, text } = talk([
    'hola',
    '1',
    '2',
    'no',
    'Ana Perez',
    '1',
    'Calle Falsa 123',
    'si',
  ]);

  assert.equal(session.step, STEPS.DONE);
  assert.match(session.orderCode, /^KC-\d{4}$/);
  assert.equal(calculateTotal(session), PRODUCTS[0].price * 2);
  assert.match(text, /Pedido confirmado/);
  assert.match(text, /Ana Perez/);
  assert.match(text, /Calle Falsa 123/);
  assert.ok(text.includes(formatPrice(PRODUCTS[0].price * 2)));
});

test('el retiro en local no pide dirección', () => {
  const { session, text } = talk(['hola', '1', '1', 'no', 'Ana', '2']);

  assert.equal(session.step, STEPS.CONFIRM);
  assert.equal(session.customer.delivery, 'Retiro en local');
  assert.equal(session.customer.address, '');
  assert.match(text, /Retiro en local/);
});

test('se acumula la cantidad si se elige el mismo producto dos veces', () => {
  const { session } = talk(['hola', '1', '1', 'si', '1', '1', 'no']);

  assert.equal(session.cart.length, 1);
  assert.equal(session.cart[0].quantity, 2);
});

test('el resumen del pedido incluye el total', () => {
  const { session } = talk(['hola', '1', '3']);
  const summary = orderSummary(session);

  assert.match(summary, /Resumen de tu pedido/);
  assert.ok(summary.includes(formatPrice(PRODUCTS[0].price * 3)));
});

test('cancelar reinicia la conversación', () => {
  const { session, text } = talk(['hola', '1', '2', 'cancelar']);

  assert.equal(session.step, STEPS.CATALOG);
  assert.equal(session.cart.length, 0);
  assert.equal(session.selectedProductId, null);
  assert.match(text, /cancelado/i);
});

test('ayuda muestra los comandos sin perder el estado', () => {
  const { session, text } = talk(['hola', '1', 'ayuda']);

  assert.equal(session.step, STEPS.QUANTITY);
  assert.match(text, /Ayuda/);
  assert.match(text, /unidades/i);
});

test('la sesión original no se mutate al procesar un mensaje', () => {
  const original = createSession();
  handleMessage(original, 'hola');

  assert.equal(original.step, STEPS.IDLE);
  assert.equal(original.cart.length, 0);
});
