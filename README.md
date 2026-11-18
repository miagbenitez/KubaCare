# KubaCare 🤖🌿

Bot de WhatsApp para **KubaCare** que atiende clientes de forma automática: saluda, muestra el catálogo de skincare, arma el pedido, calcula el total, pide los datos de entrega y confirma la venta.

Está implementado con [whatsapp-web.js](https://github.com/walteroropes/whatsapp-web.js), que se conecta a **WhatsApp Web mediante código QR**.

---

> ⚠️ **Aviso importante sobre el QR**
>
> whatsapp-web.js es una librería **no oficial**: automatizar una cuenta personal escaneando el QR de WhatsApp Web **violar los Términos de Servicio de WhatsApp** y puede derivar en la suspensión del número. Está bien para un proyecto académico, una demo o uso local controlado.
>
> Para un despliegue real se recomienda migrar a la **WhatsApp Cloud API** de Meta (oficial, sin QR, con token y número de negocio). La lógica del bot (`src/conversation.js`) es independiente de WhatsApp, así que se puede reutilizar cambiando solamente `src/index.js`.

---

## Requisitos

- Node.js 18 o superior
- Un número de WhatsApp con la app instalada en el teléfono
- Conexión a internet

## Instalación y arranque

```bash
npm install
npm start
```

En PowerShell de Windows puede que `npm.ps1` esté bloqueado por la política de ejecución. En ese caso usá `npm.cmd install` y `npm.cmd start`.

En la terminal aparecerá un código QR. Escanealo desde **WhatsApp → Dispositivos vinculados → Vincular dispositivo**.

La primera vez Puppeteer descarga un Chromium (~200 MB), así que el arranque puede tardar unos minutos. La sesión se guarda **fuera del proyecto** (en `%LOCALAPPDATA%\KubaCare\wwebjs_auth` en Windows, o `~/.kubacare/wwebjs_auth` en otros sistemas) para que OneDrive/Dropbox no bloquee el `lockfile`. En próximos arranques no hace falta volver a escanear.

### Seguridad: a quién le responde el bot 🔇

Por defecto el bot **no envía mensajes a nadie**: los mensajes que generaría se muestran solo en la terminal (modo silencioso). Nunca responde en grupos, canales ni estados.

Para habilitarlo, editá `config.js`:

```js
module.exports = {
  allowedNumbers: ['5491123456789'], // tu número, sin + ni espacios
  dryRun: false,                     // false = enviar mensajes reales
};
```

Si `allowedNumbers` está vacío, el bot ignora todos los mensajes. Si `dryRun` está en `true`, no envía nada aunque haya números permitidos.

Si Puppeteer no encuentra el navegador, se puede instalar a mano:

```bash
npx puppeteer browsers install chrome
```

O indicar un Chrome existente con la variable `PUPPETEER_EXECUTABLE_PATH`.

## ¿Cómo se usa?

El bot guía al cliente paso a paso:

1. **Saludo:** ante el primer mensaje, presenta KubaCare y muestra el catálogo.
2. **Catálogo:** 6 productos con nombre, precio y descripción.
3. **Elección:** se escribe el número del producto (o parte de su nombre) y la cantidad.
4. **Carrito:** se pueden agregar varios productos; se muestra el resumen y el total.
5. **Entrega:** pide el nombre y si quiere envío a domicilio o retiro en local (si elige envío, pide la dirección).
6. **Confirmación:** muestra el resumen final y confirma con un número de pedido `KC-####`.

Comandos disponibles en cualquier momento:

| Comando | Qué hace |
| --- | --- |
| `catálogo` / `menu` | Vuelve a mostrar los productos |
| `carrito` | Muestra el pedido y el total |
| `ayuda` | Muestra los comandos y la pregunta actual |
| `cancelar` | Cancela el pedido y reinicia la conversación |
| `sí` / `no` | Confirma o rechaza |

Si el mensaje no se entiende, el bot responde de forma amable, por ejemplo: *"🤔 No entendí. ¿Querés ver el catálogo?"*.

### Ejemplo de conversación

```text
Cliente: hola
Bot:     ¡Hola! 👋 Soy el asistente de KubaCare 🌿 ...
         🌿 *Catálogo KubaCare* 🌿
         1. *Sérum de Vitamina C* — $ 18.500 ...
Cliente: 1
Bot:     👌 *Sérum de Vitamina C* — $ 18.500
         ¿Cuántas unidades querés?
Cliente: 2
Bot:     ✅ Agregué 2 x Sérum de Vitamina C.
         🛒 *Tu pedido* ... 💰 *Total: $ 37.000*
         ¿Querés agregar otro producto? Respondé *sí* o *no*.
Cliente: no
Bot:     ¿Con qué *nombre* te registramos el pedido?
...
Cliente: si
Bot:     ✅ *¡Pedido confirmado!* ... 🎟️ Número de pedido: *KC-4821*
```

## Estructura del proyecto

```text
config.js            Números permitidos y modo silencioso
src/
  catalog.js       Catálogo de productos y formato de precios
  conversation.js  Máquina de estados del flujo de venta (pura, sin WhatsApp)
  index.js         Conexión QR con WhatsApp Web y envío de mensajes
  utils.js         Normalización de texto
test/
  conversation.test.js  Pruebas del flujo completo
```

La separación entre `conversation.js` e `index.js` permite probar toda la lógica de venta sin escanear el QR ni iniciar Chromium.

## Pruebas

```bash
npm test
```

Hay 12 pruebas que cubren el saludo inicial, la selección de productos, cantidades, totales, entrega, confirmación, cancelación y respuestas fuera de contexto.

## Solución de problemas

- **`EBUSY: resource busy or locked ... lockfile`**: significa que quedó una instancia anterior abierta o que la carpeta de sesión está siendo sincronizada. Cerrá todas las ventanas de Node/Chrome, borrá la carpeta `%LOCALAPPDATA%\KubaCare\wwebjs_auth` y volvé a arrancar (te pedirá escanear el QR otra vez).
- **`LOGOUT` / se cerró la sesión**: desvinculá el dispositivo desde WhatsApp y volvé a escanear el QR.

## Limitaciones y mejoras posibles

- Las sesiones viven **en memoria**: al reiniciar el proceso se pierden. Se podrían persistir en un archivo o base de datos.
- Los pedidos confirmados no se guardan ni se envían a un sistema externo; el resumen queda en el chat.
- `npm audit` reporta avisos de dependencias transitivas de `whatsapp-web.js`/Puppeteer. No afectan el flujo del bot, pero conviene revisarlos antes de un despliegue real.
- Para producción: usar WhatsApp Cloud API, base de datos de pedidos y manejo de errores/Reintentos más robusto.
