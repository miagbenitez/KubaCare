# KubaCare 🤖🌿

Bot de WhatsApp para **KubaCare** que atiende clientes de forma automática: saluda, muestra el catálogo de skincare, arma el pedido, calcula el total, pide los datos de entrega y confirma la venta.

La lógica de venta (`src/conversation.js`) es independiente de la conexión: se puede usar con QR o con la API oficial de Meta.

## Dos formas de conectarlo

| | Opción A: QR (no oficial) | Opción B: Cloud API (oficial, recomendada) |
| --- | --- | --- |
| **Cómo conecta** | Escaneás un QR desde WhatsApp Web | Token + número de negocio (webhook) |
| **Desde qué número responde** | El que escaneó el QR | El número configurado en Meta |
| **Archivo** | `src/index.js` | `src/cloud.js` |
| **Comando** | `npm.cmd start` | `npm.cmd run start:cloud` |
| **Términos de WhatsApp** | No oficial (riesgo de bloqueo) | Oficial |

> Opción B es la recomendada: no usa QR ni automatiza WhatsApp Web, y podés elegir el número desde el que responde (el número que registrás en Meta, o el número de prueba que Meta te da gratis).

---

## Requisitos

- Node.js 18 o superior
- Conexión a internet
- **Opción A:** un WhatsApp en el teléfono para escanear el QR
- **Opción B:** cuenta en [Meta for Developers](https://developers.facebook.com/) y un número de prueba o de negocio

## Instalación

```bash
npm install
```

En PowerShell de Windows puede que `npm.ps1` esté bloqueado por la política de ejecución. En ese caso usá `npm.cmd install` (y `npm.cmd start`/`npm.cmd test` en los comandos siguientes).

---

## Opción B: WhatsApp Cloud API (responder desde un número de Meta)

### 1. Crear la app y obtener el número de prueba

1. Entrá a [developers.facebook.com](https://developers.facebook.com/) e iniciá sesión con tu cuenta de Facebook.
2. **My Apps → Create App**. Elegí el caso de uso **Other** (o el que te muestre WhatsApp) y tipo **Business**.
3. En el panel de la app, agregá el producto **WhatsApp**.
4. Andá a **WhatsApp → API Setup** (o *Quickstart*). Ahí vas a ver:
   - **Temporary access token** → es tu `META_ACCESS_TOKEN` (vence en ~24 horas; para algo permanente hay que crear un token de sistema).
   - **Phone number ID** → es tu `META_PHONE_NUMBER_ID` (un número largo, NO es el número de teléfono).
   - **Test number** → el número desde el que va a responder el bot.
   - **To**: hacé clic en *Manage phone number list* y agregá **tu número personal** para poder probar (Meta solo permite enviar al número de prueba y a los números verificados en esta etapa).

> ⚠️ No podés poner "cualquier número" inventado: el bot responde desde el número de prueba/negocio de tu app, y en modo prueba solo puede escribirle a los números que vos agregues y verifiques.

### 2. Configurar el proyecto

Copiá el archivo de ejemplo y completá los datos:

```powershell
Copy-Item .env.example .env
```

Editá `.env`:

```env
META_ACCESS_TOKEN=EAAG...         # token temporal de API Setup
META_PHONE_NUMBER_ID=123456...    # Phone number ID
META_VERIFY_TOKEN=kubacare2026    # inventá uno, lo vas a usar al verificar el webhook
META_API_VERSION=v21.0
PORT=3000
ALLOWED_NUMBERS=                  # vacío = responde a cualquiera que le escriba
DRY_RUN=false
```

### 3. Levantar el webhook y exponerlo con ngrok

Meta necesita una URL pública HTTPS para enviar los mensajes a tu computadora. Usá [ngrok](https://ngrok.com/) (gratis):

```powershell
npm.cmd run start:cloud
# en otra ventana de PowerShell:
ngrok http 3000
```

ngrok te va a dar una URL como `https://abc123.ngrok-free.app`. La URL de tu webhook es:

```text
https://abc123.ngrok-free.app/webhook
```

### 4. Conectar el webhook en Meta

1. En **WhatsApp → Configuration → Webhook**, hacé clic en **Edit**.
2. **Callback URL**: `https://TU-URL-DE-NGROK/webhook`
3. **Verify token**: el mismo que pusiste en `META_VERIFY_TOKEN` (ej. `kubacare2026`).
4. Guardá. Deberías ver en la terminal: `✅ Webhook verificado correctamente por Meta.`
5. En *Webhook fields*, suscribite al campo **messages**.

### 5. Probar

Desde el número que agregaste en *To/recipients*, mandá `hola` al **número de prueba** de Meta. Las respuestas llegan al chat de WhatsApp desde ese número.

> Si cerrás ngrok o cambiás la URL, tenés que actualizar el Callback URL en Meta.

---

## Opción A: QR con WhatsApp Web (no oficial)

```bash
npm.cmd start
```

En la terminal aparece un QR. Escanealo desde **WhatsApp → Dispositivos vinculados → Vincular dispositivo**.

La primera vez Puppeteer descarga Chromium (~200 MB). La sesión se guarda fuera del proyecto (`%LOCALAPPDATA%\KubaCare\wwebjs_auth` en Windows) para evitar bloqueos de OneDrive.

### Seguridad del modo QR

Por defecto el bot **no envía mensajes a nadie** (modo silencioso). Nunca responde en grupos, canales ni estados. Para habilitarlo, editá `config.js`:

```js
module.exports = {
  allowedNumbers: ['5491123456789'], // número que puede escribirle al bot
  dryRun: false,
};
```

Si `allowedNumbers` está vacío, ignora a todos. Si `dryRun` es `true`, solo muestra las respuestas en la terminal.

> ⚠️ Esta opción automatiza WhatsApp Web de forma no oficial y puede derivar en la suspensión del número. Úsala solo para demos o proyectos académicos.

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
config.js            Números permitidos y modo silencioso (opción QR)
.env.example         Plantilla de credenciales de Meta (opción Cloud API)
src/
  catalog.js       Catálogo de productos y formato de precios
  conversation.js  Máquina de estados del flujo de venta (pura, sin WhatsApp)
  index.js         Conexión QR con WhatsApp Web
  cloud.js         Servidor webhook + envío por WhatsApp Cloud API
  cloud-utils.js   Parseo del payload de Meta y de números permitidos
  utils.js         Normalización de texto
test/
  conversation.test.js  Pruebas del flujo completo
  cloud.test.js         Pruebas del webhook de Meta
```

La separación entre `conversation.js` y los archivos de conexión permite probar toda la lógica de venta sin escanear el QR ni necesitar Meta.

## Pruebas

```bash
npm.cmd test
```

Hay 17 pruebas que cubren el saludo inicial, la selección de productos, cantidades, totales, entrega, confirmación, cancelación, respuestas fuera de contexto y el parseo del webhook de Meta.

## Solución de problemas

**Opción QR**

- **`EBUSY: resource busy or locked ... lockfile`**: significa que quedó una instancia anterior abierta o que la carpeta de sesión está siendo sincronizada. Cerrá todas las ventanas de Node/Chrome, borrá `%LOCALAPPDATA%\KubaCare\wwebjs_auth` y volvé a arrancar.
- **`LOGOUT` / se cerró la sesión**: desvinculá el dispositivo desde WhatsApp y volvé a escanear el QR.

**Opción Cloud API**

- **Webhook no verifica**: revisá que `META_VERIFY_TOKEN` en `.env` sea idéntico al que pusiste en Meta y que ngrok esté apuntando al puerto correcto.
- **No llegan mensajes**: asegurate de estar suscrito al campo **messages** en *Webhook fields* y de que el número que te escribe esté agregado como *recipient* (en modo prueba).
- **Error 190/401**: el token temporal venció. Copiá uno nuevo desde *API Setup*.
- **Error 131030**: el número de destino no está en la lista de destinatarios permitidos.

## Limitaciones y mejoras posibles

- Las sesiones viven **en memoria**: al reiniciar el proceso se pierden. Se podrían persistir en un archivo o base de datos.
- Los pedidos confirmados no se guardan ni se envían a un sistema externo; el resumen queda en el chat.
- En la Cloud API en modo prueba solo podés escribir a números verificados y el token temporal vence en ~24 horas.
- `npm audit` reporta avisos de dependencias transitivas de `whatsapp-web.js`/Puppeteer. No afectan el flujo del bot, pero conviene revisarlos antes de un despliegue real.
