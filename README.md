# AntiHumo — Detector de clickbait argentino

Extensión para Firefox (y compatible con Chrome) que analiza el título y el cuerpo de una nota de noticias y determina si es **humo** (clickbait) o **verdá** (fiel al contenido), usando la API de Groq.

## ¿Cómo funciona?

1. Abrí cualquier nota de un sitio de noticias argentino.
2. Tocá el ícono de AntiHumo en la barra del navegador.
3. La extensión extrae el título y el contenido de la página y se los envía a un modelo de IA de Groq.
4. Una tarjeta en la parte superior muestra el veredicto: **[HUMO]** 🔥 o **[VERDÁ]** ✅, junto con una breve explicación en lenguaje coloquial argentino.

## Instalación

La extensión **no trae una clave de API incluida**. Necesitás una clave propia gratuita de [Groq](https://console.groq.com/keys) para usarla.

### Firefox

1. Firmá la extensión (ver [Firmar la extensión](#firmar-la-extensión)) o instalá un `.xpi` ya firmado.
2. En Firefox, abrí `about:addons`.
3. Tocá el ícono de engranaje (arriba a la derecha) → **Instalar complemento desde archivo**.
4. Seleccioná el `.xpi` firmado y confirmá la instalación.
5. En `about:addons` → AntiHumo → **Opciones**, pegá tu [clave de Groq](https://console.groq.com/keys) y guardala. (El clic en el ícono de la barra analiza la página directamente; la configuración vive en la página de Opciones.)

### Chrome

1. Abrí `chrome://extensions`.
2. Activá **Modo de desarrollador** (interruptor arriba a la derecha).
3. Tocá **Cargar descomprimida** y seleccioná la carpeta de este repositorio.
4. Tocá el ícono de AntiHumo en la barra, abrí el popup y pegá tu [clave de Groq](https://console.groq.com/keys).

### Instalación temporal (pruebas / desarrollo)

Sin firmar, para probar cambios sin pasar por AMO:

- **Firefox**: abrí `about:debugging#/runtime/this-firefox` → **Cargar complemento temporal** → seleccioná el `manifest.json` del repo.
  El complemento se desactiva al cerrar Firefox; es solo para desarrollo.
- **Chrome**: es la misma opción de *Load unpacked* de arriba; la extensión carga descomprimida y permanece instalada aunque no esté "firmada".

## Configuración

Abrí la página de Opciones (`about:addons` → AntiHumo → **Opciones**) > **Tu clave API de Groq**:

- **Guardar clave**: guarda tu clave personal; la página verifica que funcione contra la API.
- **Restablecer**: elimina la clave guardada.
- **Probar análisis end-to-end**: hace un análisis real de prueba contra el modelo configurado (`openai/gpt-oss-20b`, con fallback a `openai/gpt-oss-120b`) para confirmar que todo el circuito funciona, no solo la clave.

La clave se almacena localmente en el navegador (`chrome.storage.local`) y no sale de tu equipo.

## Estructura

```
background/service-worker.js  # Lógica de análisis y llamadas a la API de Groq
content/content.js            # Inyectado en la página: extracción, tarjeta y veredicto
content/overlay.css           # Estilos de la tarjeta de resultado
popup/                        # Interfaz del popup (configuración de clave)
icons/                        # Íconos de la extensión
manifest.json                 # Declaración de la extensión
```

## Firmar la extensión

Para firmar con [web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/):

```bash
web-ext sign --source-dir ./ --artifacts-dir ./dist --channel unlisted \
  --api-key "user:TU_ISSUER" --api-secret "TU_SECRETO"
```

En Windows:

```powershell
web-ext sign --source-dir . --artifacts-dir .\dist --channel unlisted --api-key "user:TU_ISSUER" --api-secret "TU_SECRETO"
```

> **Importante:** no guardés tu clave de API dentro de la carpeta del repositorio: `web-ext` empaqueta todo el contenido del directorio, y AMO rechaza los archivos que contienen credenciales.

Los identificadores de API se generan en <https://addons.mozilla.org/en-US/developers/addon/api/key/>.

## Actualizar

1. Cambiá la versión en `manifest.json`.
2. Volvé a firmar (paso anterior).
3. Reinstalá el `.xpi` nuevo desde `about:addons`. La clave de API configurada se conserva.

## Permisos y datos

La extensión envía el título y el contenido de la nota que estás visitando a la API de Groq para su análisis, por lo que el manifest declara `websiteContent` en `data_collection_permissions`.