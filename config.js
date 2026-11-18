'use strict';

/*
 * CONFIGURACIÓN DE SEGURIDAD DEL BOT
 *
 * Por defecto el bot NO escribe a nadie: está en modo silencioso.
 * Para probarlo, agregá tu número a `allowedNumbers` y pasá `dryRun` a false.
 */

module.exports = {
  // Únicos números que pueden recibir respuestas del bot.
  // Vacío = el bot ignora a todo el mundo.
  // Formato: código de país + número, sin +, espacios ni guiones.
  // Ejemplo: ['5491123456789']
  allowedNumbers: [],

  // true = no envía mensajes reales, solo los muestra en la terminal.
  // false = envía mensajes reales a los números permitidos.
  dryRun: true,
};
