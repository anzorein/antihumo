(function () {
  if (window.__ANTIHUMO_ACTIVE__) {
    if (typeof window.__ANTIHUMO_TRIGGER__ === 'function') {
      window.__ANTIHUMO_TRIGGER__();
    } else {
      window.__ANTIHUMO_ACTIVE__ = false;
    }
    return;
  }
  window.__ANTIHUMO_ACTIVE__ = true;

  let overlayEl = document.getElementById('ah-overlay');
  let analyzing = false;

  function cleanText(text) {
    return (text || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractTitle() {
    const sel = document.querySelector(
      'article h1, article h2, [role="main"] h1, main h1, .nota__titulo h2, .article-title, .entry-title, .post-title'
    );
    if (sel) return cleanText(sel.innerText);

    const og = document.querySelector('meta[property="og:title"]');
    if (og && og.content) return cleanText(og.content);

    const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of ldScripts) {
      try {
        const data = JSON.parse(s.textContent);
        const nodes = Array.isArray(data) ? data : [data];
        for (const node of nodes) {
          if (node && /Article|NewsArticle/.test(node['@type'] || '') && node.headline) {
            return cleanText(node.headline);
          }
        }
      } catch (e) {}
    }

    return cleanText(document.title) || 'Sin título';
  }

  function extractBody() {
    const candidates = [
      'article',
      '[role="main"]',
      'main',
      '.article-body',
      '.nota__body',
      '.entry-content',
      '.post-content',
      '.article-content'
    ];
    let root = null;
    for (const c of candidates) {
      const el = document.querySelector(c);
      if (el && el.innerText.trim().length > 300) {
        root = el;
        break;
      }
    }
    if (!root) root = document.body;

    const clone = root.cloneNode(true);
    clone
      .querySelectorAll(
        'script,style,noscript,iframe,nav,header,footer,aside,.ads,.advertising,.publicidad,.share,.compartir,button,form,input,video,figure,.tags,ul,svg,canvas'
      )
      .forEach((el) => el.remove());

    const paragraphs = clone.querySelectorAll('p, h1, h2, h3, blockquote');
    let text;
    if (paragraphs.length > 0) {
      text = Array.from(paragraphs)
        .map((p) => cleanText(p.innerText))
        .filter(Boolean)
        .join('\n');
    } else {
      text = cleanText(clone.innerText);
    }

    if (text.length > 6000) {
      text = text.slice(0, 6000) + ' [TEXTO TRUNCADO]';
    }
    return text;
  }

  function triggerAnalysis() {
    if (analyzing) return;
    analyzing = true;

    const title = extractTitle();
    const body = extractBody();

    if (!body || body.length < 60) {
      showOverlay('error', 'No se pudo extraer el contenido de la nota. Probá en la misma página de la nota, no en el home.', title);
      analyzing = false;
      return;
    }

    showOverlay('loading', 'Analizando si esto es humo o verdá…', title);

    runtimeSendMessage({ action: 'analyze', title, body })
      .then((res) => {
        if (!res || res.error) {
          const e = (res && res.error) || 'Error desconocido';
          showOverlay('error', formatError(e), title, null, needsOptionsButton(e));
        } else {
          showOverlay('result', res.answer, title, res.verdict);
        }
      })
      .catch(() => {
        showOverlay('error', 'Algo salió mal al conectarse con el servidor.', title);
      })
      .finally(() => {
        analyzing = false;
      });
  }

  function formatError(err) {
    const s = String(err || '');
    const sep = s.indexOf(':');
    const code = (sep === -1 ? s : s.slice(0, sep)).trim().toUpperCase();
    const detail = sep === -1 ? s : s.slice(sep + 1).trim();
    if (code === 'NO_API_KEY') {
      return 'Falta tu clave de Groq. Tocá "Abrir opciones" acá abajo y guardala.';
    }
    if (code === 'BAD_KEY') {
      return 'Tu clave de Groq fue rechazada (401/403). Tocá "Abrir opciones" y revisala.';
    }
    if (code === 'RATE_LIMIT') {
      return 'Se pasó el límite de consultas gratuitas por un ratito. Esperá unos minutos y volvé a intentar.';
    }
    if (code === 'MODEL_UNAVAILABLE') {
      return 'Ningún modelo de IA está respondiendo ahora. ' + detail + ' Probá más tarde.';
    }
    if (code === 'NETWORK') {
      return 'No se pudo conectar con Groq. Revisá tu conexión a internet.';
    }
    if (/limit|429|quota|rate/i.test(s)) {
      return 'Se pasó el límite de consultas gratuitas por un ratito. Esperá unos minutos y volvé a intentar.';
    }
    if (/api key|401|403/i.test(s)) {
      return 'Problema con la clave de la API. Abrí el ícono de AntiHumo y revisala.';
    }
    if (/404|model/i.test(s)) {
      return 'El modelo de IA no está disponible. Probá más tarde.';
    }
    return s;
  }

  function needsOptionsButton(err) {
    const s = String(err || '');
    const sep = s.indexOf(':');
    const code = (sep === -1 ? '' : s.slice(0, sep)).trim().toUpperCase();
    return code === 'NO_API_KEY' || code === 'BAD_KEY';
  }

  function cleanAnswer(text) {
    return String(text || '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .trim();
  }

  function showOverlay(status, text, title, verdict, showOptionsBtn) {
    if (!overlayEl) {
      overlayEl = document.createElement('div');
      overlayEl.id = 'ah-overlay';
      document.body.appendChild(overlayEl);
    }

    overlayEl.dataset.status = status;
    const clean = cleanAnswer(text);

    let content = '';
    if (status === 'loading') {
      content = `
        <div class="ah-card ah-loading">
          <div class="ah-spinner"></div>
          <div class="ah-texts">
            <div class="ah-title">AntiHumo está leyendo la nota…</div>
            <div class="ah-sub">${esc(title)}</div>
          </div>
        </div>`;
    } else if (status === 'error') {
      content = `
        <div class="ah-card ah-error">
          <div class="ah-icon ah-icon-error">⚠️</div>
          <div class="ah-texts">
            <div class="ah-title">No se pudo analizar</div>
            <div class="ah-body">${esc(clean)}</div>
            ${showOptionsBtn ? '<button class="ah-options" data-ah-options="1">Abrir opciones</button>' : ''}
          </div>
          <button class="ah-close" data-ah-close="1" aria-label="Cerrar">✕</button>
        </div>`;
    } else {
      const isHumo = verdict === 'HUMO';
      const badge = verdict
        ? `<div class="ah-badge ah-badge-${isHumo ? 'humo' : 'verdad'}">${isHumo ? 'HUMO' : 'VERDÁ'}</div>`
        : '';
      content = `
        <div class="ah-card ah-result">
          <div class="ah-icon ${isHumo ? 'ah-icon-humo' : 'ah-icon-verdad'}">${isHumo ? '🔥' : '✅'}</div>
          <div class="ah-texts">
            <div class="ah-title">${badge}<span>AntiHumo dice:</span></div>
            <div class="ah-body">${esc(clean)}</div>
          </div>
          <button class="ah-close" data-ah-close="1" aria-label="Cerrar">✕</button>
        </div>`;
    }

    overlayEl.innerHTML = content;
    overlayEl.classList.add('ah-visible');

    overlayEl.querySelector('[data-ah-close]')?.addEventListener('click', hideOverlay);
    overlayEl.querySelector('[data-ah-options]')?.addEventListener('click', () => {
      runtimeSendMessage({ action: 'openOptions' });
    });
  }

  function hideOverlay() {
    if (overlayEl) overlayEl.classList.remove('ah-visible');
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function runtimeSendMessage(msg) {
    if (typeof browser !== 'undefined' && browser.runtime) {
      return browser.runtime.sendMessage(msg);
    }
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (res) => {
        if (chrome.runtime.lastError) resolve({ error: chrome.runtime.lastError.message });
        else resolve(res);
      });
    });
  }

  window.__ANTIHUMO_TRIGGER__ = triggerAnalysis;
  triggerAnalysis();
})();