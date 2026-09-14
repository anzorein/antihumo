const DEFAULT_API_KEY = '';
const DEFAULT_MODEL = 'qwen/qwen3.6-27b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_ORIGIN = 'https://api.groq.com';

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
  throw new Error('No API key configured. Open the extension popup and enter your Groq API key.');
}

async function analyze(title, body) {
  const apiKey = await getApiKey();
  const truncatedBody = body.length > 6000 ? body.slice(0, 6000) : body;

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      reasoning_effort: 'none',
      temperature: 0.3,
      max_tokens: 250,
      messages: [
        { role: 'system', content: ANTIHUMO_PROMPT },
        {
          role: 'user',
          content: 'Título: ' + title + '\n\nContenido de la nota:\n' + truncatedBody
        }
      ]
    })
  });

  if (!response.ok) {
    let body;
    try {
      const j = await response.json();
      body = j?.error?.message || JSON.stringify(j);
    } catch {
      body = response.statusText;
    }
    throw new Error('HTTP ' + response.status + ': ' + body);
  }

  const data = await response.json();
  const answer = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';

  const verdictMatch = answer.match(/\[VEREDICTO:\s*(HUMO|VERDAD)\]/i);
  const verdict = verdictMatch ? verdictMatch[1].toUpperCase() : null;

  return { answer, verdict };
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
});