const DEFAULT_MODEL = 'openai/gpt-oss-20b';
const FALLBACK_MODELS = ['openai/gpt-oss-120b'];
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const api = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

const ANTIHUMO_PROMPT = [
  'Sos AntiHumo, un detector de títulos engañosos de noticias argentinas.',
  'Dado el título y el cuerpo de una nota, respondé en máximo 2 oraciones:',
  '1. ¿El título es clickbait o refleja fielmente el contenido?',
  '2. ¿Qué dice realmente la nota?',
  '',
  'Sé directo, sarcastico y usá lenguaje coloquial argentino.',
  'Si el título es honesto, reconocelo. Si es humo, decilo.',
  'Respondé SOLO con este formato exacto:',
  '[VEREDICTO: HUMO] o [VEREDICTO: VERDAD] seguido de la explicación.',
  'No salgas de ese formato. No uses comillas ni asteriscos.'
].join('\n');

async function getApiKey() {
  try {
    const data = await api.storage.local.get('apiKey');
    if (data.apiKey) return data.apiKey;
  } catch {}
  throw new Error('NO_API_KEY: no hay clave API configurada.');
}

function buildRequestBody(model, title, body) {
  return {
    model,
    messages: [
      {
        role: 'user',
        content: ANTIHUMO_PROMPT + '\n\nTítulo: ' + title + '\n\nContenido de la nota:\n' + body
      }
    ],
    reasoning_effort: 'low',
    include_reasoning: false,
    temperature: 0.6,
    top_p: 0.95,
    max_completion_tokens: 400
  };
}

function cleanAnswer(text) {
  return String(text || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
}

function parseVerdict(answer) {
  let m = answer.match(/\[VEREDICTO:\s*(HUMO|VERDAD)\]/i);
  if (m) return m[1].toUpperCase();
  m = answer.match(/VEREDICTO:\s*(HUMO|VERDAD)/i);
  if (m) return m[1].toUpperCase();
  return null;
}

function isModelGone(status, info) {
  if (status === 404) return true;
  return /model_not_found|model_not_supported|decommission|does not exist|not found/i.test(info || '');
}

async function tryModel(apiKey, model, title, truncatedBody) {
  let response;
  try {
    response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildRequestBody(model, title, truncatedBody))
    });
  } catch (e) {
    throw new Error('NETWORK: ' + String((e && e.message) || e));
  }

  if (!response.ok) {
    let detail;
    try {
      const j = await response.json();
      detail = (j && j.error && j.error.message) || JSON.stringify(j);
    } catch {
      detail = response.statusText;
    }
    const info = 'HTTP ' + response.status + ': ' + detail;
    if (response.status === 401 || response.status === 403) {
      throw new Error('BAD_KEY: ' + info);
    }
    if (response.status === 429) {
      const err = new Error('RATE_LIMIT: ' + info);
      err.retryWithFallback = true;
      throw err;
    }
    if (isModelGone(response.status, info)) {
      const err = new Error('MODEL_GONE: ' + model + ' (' + info + ')');
      err.retryWithFallback = true;
      throw err;
    }
    throw new Error('UPSTREAM: ' + info);
  }

  const data = await response.json();
  const raw = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  const answer = cleanAnswer(raw);
  if (!answer) {
    const err = new Error('EMPTY_RESPONSE: el modelo devolvió una respuesta vacía.');
    err.retryWithFallback = true;
    throw err;
  }

  return { answer, verdict: parseVerdict(answer), model };
}

async function analyze(title, body) {
  const apiKey = await getApiKey();
  const truncatedBody = body.length > 6000 ? body.slice(0, 6000) : body;

  const models = [DEFAULT_MODEL, ...FALLBACK_MODELS];
  let lastError = null;
  for (const model of models) {
    try {
      return await tryModel(apiKey, model, title, truncatedBody);
    } catch (err) {
      if (err && err.retryWithFallback) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  throw new Error(
    'MODEL_UNAVAILABLE: ningún modelo respondió (' + models.join(', ') + '). ' +
    String((lastError && lastError.message) || '')
  );
}

async function injectIntoTab(tabId) {
  try {
    await api.scripting.insertCSS({ target: { tabId }, files: ['content/overlay.css'] });
    await api.scripting.executeScript({ target: { tabId }, files: ['content/content.js'] });
  } catch (err) {
    console.error('AntiHumo: no se pudo inyectar en la pestaña', err);
  }
}

api.action.onClicked.addListener(async () => {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) injectIntoTab(tab.id);
});

api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'analyze') {
    analyze(msg.title, msg.body)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ error: String(err.message || err) }));
    return true;
  }
  if (msg && msg.action === 'openOptions') {
    Promise.resolve()
      .then(() => api.runtime.openOptionsPage())
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ error: String((err && err.message) || err) }));
    return true;
  }
});
