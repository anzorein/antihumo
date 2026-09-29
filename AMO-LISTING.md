# AntiHumo — AMO listing assets (v1.0.0)

Paste-ready texts for the addons.mozilla.org listed submission.
IMPORTANT: exclude this file from the signed package (`--ignore-files` in the sign command below).

## Summary (short, shown in search results)

Detector de clickbait argentino: tocá el ícono y descubrí si el título de la nota es humo o verdá.

## Description (listing page)

**AntiHumo — Detector de Clickbait**

¿El título de la nota es posta o es humo? AntiHumo lo analiza por vos:

1. Abrí cualquier nota de un sitio de noticias.
2. Tocá el ícono de AntiHumo en la barra del navegador.
3. Una tarjeta te muestra el veredicto — 🔥 **HUMO** o ✅ **VERDÁ** — con una breve explicación en lenguaje coloquial argentino.

Usa tu propia clave gratuita de Groq (se configura una sola vez en la página de Opciones y queda guardada en tu navegador). Incluye un botón de "Probar análisis end-to-end" para verificar que todo funciona.

## Privacy policy (required — AMO rejects data-transmitting add-ons without one)

AntiHumo no recolecta, almacena ni comparte ningún dato personal en servidores propios: no tenemos servidores.

- Cuando tocás el ícono de AntiHumo, el título y el texto de la nota que estás visitando se envían a la API de Groq (https://api.groq.com) para generar el veredicto. Esto ocurre únicamente cuando vos lo pedís, clic por clic.
- Tu clave de la API de Groq se guarda localmente en tu navegador (storage local de la extensión) y solo se usa para autenticar esos pedidos. Podés borrarla en cualquier momento desde la página de Opciones (Restablecer).
- La extensión no usa cookies, analítica ni rastreadores de ningún tipo.

## Notes for reviewers (English — paste into "Notes to reviewer")

Thank you for reviewing AntiHumo! Testing notes:

- The extension requires a free user-supplied Groq API key (https://console.groq.com/keys). Without it, clicking the toolbar icon shows a card with an "Abrir opciones" button that opens the options page (`options_ui`), where the key can be pasted and saved.
- The options page has a "Probar análisis end-to-end" button that runs a real chat completion against the configured model (`openai/gpt-oss-20b`, fallback `openai/gpt-oss-120b`, both free-tier Groq production models) and reports the model + verdict — the fastest way to verify the full circuit.
- Data flow: on toolbar click only, the content script extracts the article title/body from the active tab (via `scripting` + `activeTab`) and POSTs it to `https://api.groq.com/openai/v1/chat/completions` (declared in `host_permissions`). Nothing is sent on page load or in the background.
- Codebase is plain dependency-free JavaScript, no minification, no remote code.
- The single `addons-linter` warning (`UNSAFE_VAR_ASSIGNMENT`, `content/content.js`, `overlayEl.innerHTML = content`) is a false positive: every dynamic value interpolated into the card HTML passes through the `esc()` HTML-escaping function defined in the same file; no raw page content ever reaches `innerHTML`.

## Suggested listing metadata

- Category: Blogging / News & Weather (elegir la que aplique: "Feeds, News & Blogging")
- License: pick one on AMO (sugerido: MIT — if so, add a LICENSE file to the repo)
- Homepage: https://github.com/anzorein/antihumo
- Version for public debut: 1.0.0 (0.4.0 already exists on the unlisted channel; version strings must be unique)

## Sign command (listed channel, clean package)

Run from anywhere (adjust paths). `--channel=listed` submits the version for public review:

```powershell
web-ext sign --source-dir "D:\Projects\IA\AntiHumo\antiHumo" --artifacts-dir "D:\Projects\IA\AntiHumo\antiHumo\dist" --channel=listed --ignore-files "dist" ".git" ".gitignore" "AMO-LISTING.md" "*.bat" ".amo-upload-uuid" --api-key "user:TU_ISSUER" --api-secret "TU_SECRETO"
```

After approval, the public URL looks like `https://addons.mozilla.org/firefox/addon/antihumo/`.
Future updates: bump `version` in manifest.json and re-run the same command (listed channel from now on; stop using unlisted).
