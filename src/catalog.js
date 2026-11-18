'use strict';

const { normalize } = require('./utils');

const PRODUCTS = [
  {
    id: 1,
    name: 'Sérum de Vitamina C',
    price: 18500,
    description: 'Ilumina y unifica el tono. Reduce manchas y líneas finas.',
  },
  {
    id: 2,
    name: 'Crema hidratante facial',
    price: 14900,
    description: 'Hidratación 24 hs con ácido hialurónico. Textura liviana.',
  },
  {
    id: 3,
    name: 'Limpiador suave',
    price: 9800,
    description: 'Limpia sin resecar. Apto para piel sensible.',
  },
  {
    id: 4,
    name: 'Protector solar FPS 50',
    price: 16500,
    description: 'Protección diaria, no comedogénico y sin residuo blanco.',
  },
  {
    id: 5,
    name: 'Mascarilla de arcilla',
    price: 11200,
    description: 'Purifica los poros y controla el exceso de sebo.',
  },
  {
    id: 6,
    name: 'Aceite de rosa mosqueta',
    price: 13700,
    description: 'Regenera la piel y suaviza cicatrices y marcas.',
  },
];

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

function formatPrice(value) {
  return currency.format(value);
}

function getProductById(id) {
  return PRODUCTS.find((product) => product.id === Number(id)) || null;
}

/** Busca un producto por número o por palabras del nombre. */
function findProductFromInput(rawText) {
  const text = normalize(rawText);

  if (/^\d+$/.test(text)) {
    return getProductById(text);
  }

  const exact = PRODUCTS.find((product) => normalize(product.name) === text);
  if (exact) return exact;

  return (
    PRODUCTS.find((product) => {
      const words = normalize(product.name)
        .split(' ')
        .filter((word) => word.length > 2);
      return words.some((word) => text.includes(word));
    }) || null
  );
}

function formatCatalog() {
  const items = PRODUCTS.map(
    (product) =>
      `${product.id}. *${product.name}* — ${formatPrice(product.price)}\n   ${product.description}`,
  );

  return ['🌿 *Catálogo KubaCare* 🌿', '', ...items, '', 'Elegí el *número* del producto que quieras.'].join(
    '\n',
  );
}

module.exports = {
  PRODUCTS,
  formatPrice,
  formatCatalog,
  getProductById,
  findProductFromInput,
};
