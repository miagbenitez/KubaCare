'use strict';

/**
 * Normaliza un texto para compararlo sin importar mayúsculas ni acentos.
 * Ejemplo: 'Sí' -> 'si', 'Catálogo' -> 'catalogo'.
 */
function normalize(text = '') {
  return String(text)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

module.exports = { normalize };
