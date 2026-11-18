'use strict';

const { PRODUCTS, findProductFromInput, getProductById, formatCatalog, formatPrice } = require('./catalog');
const { normalize } = require('./utils');

const STEPS = {
  IDLE: 'IDLE',
  CATALOG: 'CATALOG',
  QUANTITY: 'QUANTITY',
  ADD_MORE: 'ADD_MORE',
  ASK_NAME: 'ASK_NAME',
  ASK_DELIVERY: 'ASK_DELIVERY',
  ASK_ADDRESS: 'ASK_ADDRESS',
  CONFIRM: 'CONFIRM',
  DONE: 'DONE',
};

const WELCOME = [
  '¡Hola! 👋 Soy el asistente de *KubaCare* 🌿',
  'Cuidamos tu piel con productos naturales y libres de crueldad animal.',
  'Te muestro lo que tenemos para que elijas lo que más te guste.',
].join('\n');

const UNKNOWN = '🤔 No entendí. ¿Querés ver el *catálogo*?';

const HELP = [
  '🆘 *Ayuda*',
  '• Escribí el *número* de un producto para elegirlo.',
  '• *catálogo* → volver a ver los productos.',
  '• *carrito* → ver tu pedido y el total.',
  '• *cancelar* → cancelar el pedido.',
  '• *sí* / *no* → para confirmar.',
].join('\n');

const YES = new Set(['si', 's', 'ya', 'dale', 'adelante', 'ok', 'confirmar', 'confirmo', 'aceptar']);
const NO = new Set(['no', 'n', 'editar']);
const CANCEL = new Set(['cancelar', 'salir', 'borrar', 'reset']);
const HELP_WORDS = new Set(['ayuda', 'help', 'ayudame', '?']);
const CATALOG_WORDS = new Set(['catalogo', 'menu', 'productos', 'ver catalogo', 'ver productos', 'lista', 'ver']);
const CART_WORDS = new Set(['carrito', 'ver carrito', 'mi pedido', 'total']);

function createSession() {
  return {
    step: STEPS.IDLE,
    cart: [],
    selectedProductId: null,
    customer: { name: '', delivery: '', address: '' },
    orderCode: null,
  };
}

function calculateTotal(session) {
  return session.cart.reduce((total, item) => {
    const product = getProductById(item.productId);
    return total + (product ? product.price * item.quantity : 0);
  }, 0);
}

function cartSummary(session) {
  if (!session.cart.length) {
    return '🛒 Tu carrito está vacío.';
  }

  const lines = session.cart.map((item, index) => {
    const product = getProductById(item.productId);
    return `${index + 1}. ${product.name} x${item.quantity} — ${formatPrice(product.price * item.quantity)}`;
  });

  return ['🛒 *Tu pedido*', '', ...lines, '', `💰 *Total: ${formatPrice(calculateTotal(session))}*`].join('\n');
}

function orderSummary(session) {
  const lines = [
    '🧾 *Resumen de tu pedido*',
    '',
    ...session.cart.map((item) => {
      const product = getProductById(item.productId);
      return `${product.name} x${item.quantity} — ${formatPrice(product.price * item.quantity)}`;
    }),
    '',
    `💰 *Total: ${formatPrice(calculateTotal(session))}*`,
    '',
    `👤 Nombre: ${session.customer.name || '-'}`,
    `🚚 Entrega: ${session.customer.delivery || '-'}`,
  ];

  if (session.customer.address) {
    lines.push(`📍 Dirección: ${session.customer.address}`);
  }

  return lines.join('\n');
}

function promptFor(step) {
  const prompts = {
    [STEPS.IDLE]: '¿Querés ver el catálogo?',
    [STEPS.CATALOG]: 'Elegí el *número* del producto.',
    [STEPS.QUANTITY]: '¿Cuántas unidades querés?',
    [STEPS.ADD_MORE]: '¿Querés agregar otro producto? Respondé *sí* o *no*.',
    [STEPS.ASK_NAME]: '¿Con qué *nombre* te registramos?',
    [STEPS.ASK_DELIVERY]: '¿Envío a domicilio (*1*) o retiro en local (*2*)?',
    [STEPS.ASK_ADDRESS]: 'Escribí la dirección de entrega 📍',
    [STEPS.CONFIRM]: '¿Confirmás el pedido? Respondé *sí* o *no*.',
    [STEPS.DONE]: 'Si querés hacer otro pedido, escribí *nuevo pedido*.',
  };
  return prompts[step] || '';
}

function addToCart(session, productId, quantity) {
  const existing = session.cart.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    session.cart.push({ productId, quantity });
  }
}

function generateOrderCode() {
  return `KC-${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Procesa un mensaje del cliente y devuelve el nuevo estado + las respuestas.
 * Es una función pura: no muta la sesión que recibe.
 */
function handleMessage(session, rawText = '') {
  const current = session
    ? { ...session, cart: session.cart.map((item) => ({ ...item })), customer: { ...session.customer } }
    : createSession();
  const text = normalize(rawText);
  const replies = [];

  // Comandos globales
  if (CANCEL.has(text)) {
    const fresh = createSession();
    fresh.step = STEPS.CATALOG;
    replies.push('🛑 Pedido cancelado. Acá tenés el catálogo si querés empezar de nuevo:');
    replies.push(formatCatalog());
    return { session: fresh, replies };
  }

  if (HELP_WORDS.has(text)) {
    replies.push(HELP);
    replies.push(promptFor(current.step));
    return { session: current, replies };
  }

  switch (current.step) {
    case STEPS.IDLE: {
      replies.push(WELCOME);
      replies.push(formatCatalog());
      current.step = STEPS.CATALOG;
      break;
    }

    case STEPS.CATALOG: {
      if (CATALOG_WORDS.has(text)) {
        replies.push(formatCatalog());
        break;
      }
      if (CART_WORDS.has(text)) {
        replies.push(cartSummary(current));
        break;
      }

      const product = findProductFromInput(text);
      if (product) {
        current.selectedProductId = product.id;
        current.step = STEPS.QUANTITY;
        replies.push(`👌 *${product.name}* — ${formatPrice(product.price)}\n¿Cuántas unidades querés?`);
      } else if (/^\d+$/.test(text)) {
        replies.push(`No encontré el producto ${text}. Elegí un número del 1 al ${PRODUCTS.length}.`);
      } else {
        replies.push(`${UNKNOWN}\nElegí un número del 1 al ${PRODUCTS.length} o escribí *catálogo*.`);
      }
      break;
    }

    case STEPS.QUANTITY: {
      if (CATALOG_WORDS.has(text)) {
        replies.push(formatCatalog());
        current.step = STEPS.CATALOG;
        break;
      }
      if (!/^\d+$/.test(text)) {
        replies.push(`${UNKNOWN}\nEscribí una cantidad, por ejemplo *2*.`);
        break;
      }

      const quantity = Number(text);
      if (quantity < 1 || quantity > 99) {
        replies.push('La cantidad debe estar entre 1 y 99. ¿Cuántas unidades querés?');
        break;
      }

      const product = getProductById(current.selectedProductId);
      if (!product) {
        replies.push(formatCatalog());
        current.step = STEPS.CATALOG;
        break;
      }

      addToCart(current, product.id, quantity);
      current.selectedProductId = null;
      current.step = STEPS.ADD_MORE;
      replies.push(`✅ Agregué ${quantity} x ${product.name}.`);
      replies.push(`${cartSummary(current)}\n\n¿Querés agregar otro producto? Respondé *sí* o *no*.`);
      break;
    }

    case STEPS.ADD_MORE: {
      if (YES.has(text)) {
        replies.push(formatCatalog());
        current.step = STEPS.CATALOG;
      } else if (NO.has(text) || CART_WORDS.has(text)) {
        replies.push(cartSummary(current));
        current.step = STEPS.ASK_NAME;
        replies.push('¿Con qué *nombre* te registramos el pedido?');
      } else if (CATALOG_WORDS.has(text)) {
        replies.push(formatCatalog());
        current.step = STEPS.CATALOG;
      } else {
        replies.push(`${UNKNOWN}\n¿Querés agregar otro producto? Respondé *sí* o *no*.`);
      }
      break;
    }

    case STEPS.ASK_NAME: {
      const letters = text.match(/[a-z]/g) || [];
      if (letters.length < 2) {
        replies.push('Necesito tu nombre para registrar el pedido. Escribí tu nombre y apellido 🙏');
        break;
      }
      current.customer.name = rawText.trim();
      current.step = STEPS.ASK_DELIVERY;
      replies.push(`¡Gracias, ${current.customer.name}! 😊`);
      replies.push(
        ['🚚 ¿Cómo querés recibir tu pedido?', '1️⃣ Envío a domicilio', '2️⃣ Retiro en local', '', 'Escribí *1* o *2*.'].join('\n'),
      );
      break;
    }

    case STEPS.ASK_DELIVERY: {
      if (text === '1' || text.includes('domicilio') || text.includes('delivery') || text.includes('envio')) {
        current.customer.delivery = 'Envío a domicilio';
        current.step = STEPS.ASK_ADDRESS;
        replies.push('📍 Escribí la dirección de entrega (calle, número y localidad).');
      } else if (text === '2' || text.includes('retiro') || text.includes('local') || text.includes('pickup')) {
        current.customer.delivery = 'Retiro en local';
        current.step = STEPS.CONFIRM;
        replies.push(orderSummary(current));
        replies.push('¿Confirmás el pedido? Respondé *sí* o *no*.');
      } else {
        replies.push(`${UNKNOWN}\nEscribí *1* para envío a domicilio o *2* para retiro en local.`);
      }
      break;
    }

    case STEPS.ASK_ADDRESS: {
      if (text.length < 5) {
        replies.push('Necesito la dirección completa (calle, número y localidad) 📍');
        break;
      }
      current.customer.address = rawText.trim();
      current.step = STEPS.CONFIRM;
      replies.push(orderSummary(current));
      replies.push('¿Confirmás el pedido? Respondé *sí* o *no*.');
      break;
    }

    case STEPS.CONFIRM: {
      if (YES.has(text)) {
        current.orderCode = generateOrderCode();
        current.step = STEPS.DONE;
        replies.push(
          [
            '✅ *¡Pedido confirmado!*',
            '',
            orderSummary(current),
            '',
            `🎟️ Número de pedido: *${current.orderCode}*`,
            '',
            'Te avisaremos cuando esté listo. ¡Gracias por elegir KubaCare! 🌿',
          ].join('\n'),
        );
      } else if (NO.has(text)) {
        const fresh = createSession();
        fresh.step = STEPS.CATALOG;
        replies.push('Pedido cancelado. Si querés, podemos empezar de nuevo 🙌');
        replies.push(formatCatalog());
        return { session: fresh, replies };
      } else if (CART_WORDS.has(text)) {
        replies.push(orderSummary(current));
      } else {
        replies.push(`${UNKNOWN}\n¿Confirmás el pedido? Respondé *sí* o *no*.`);
      }
      break;
    }

    case STEPS.DONE: {
      if (YES.has(text) || ['nuevo pedido', 'otro pedido', 'pedido'].includes(text)) {
        const fresh = createSession();
        fresh.step = STEPS.CATALOG;
        replies.push('¡Buenísimo! 👇');
        replies.push(formatCatalog());
        return { session: fresh, replies };
      }
      replies.push(
        `Tu pedido *${current.orderCode}* ya está confirmado ✅. Si querés hacer otro, escribí *nuevo pedido*.`,
      );
      break;
    }

    default: {
      return { session: createSession(), replies: [WELCOME, formatCatalog()] };
    }
  }

  return { session: current, replies };
}

module.exports = {
  STEPS,
  WELCOME,
  UNKNOWN,
  createSession,
  handleMessage,
  calculateTotal,
  cartSummary,
  orderSummary,
  promptFor,
};
