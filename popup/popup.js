const api = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

const DEFAULT_KEY_HINT = 'gsk_XXXXX';

const dot = document.getElementById('dot');
const statusText = document.getElementById('status-text');
const input = document.getElementById('api-key');
const toggleBtn = document.getElementById('toggle-visibility');
const saveBtn = document.getElementById('save');
const resetBtn = document.getElementById('reset');
const testBtn = document.getElementById('test');
const msg = document.getElementById('msg');

const TEST_TITLE = 'Prueba de conexión de AntiHumo';
const TEST_BODY = 'Esta es una prueba de conexión. El Congreso aprobó por unanimidad una ley de educación vial. La norma, votada por todos los bloques, entrará en vigencia el próximo ciclo lectivo según informó el Ministerio.';

function runtimeSendMessage(message) {
  if (typeof browser !== 'undefined' && browser.runtime) {
    return browser.runtime.sendMessage(message);
  }
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (res) => {
      if (chrome.runtime.lastError) resolve({ error: chrome.runtime.lastError.message });
      else resolve(res);
    });
  });
}

async function getStored() {
  return api.storage.local.get('apiKey');
}

async function checkKey() {
  const { apiKey } = await getStored();
  if (!apiKey || apiKey === DEFAULT_KEY_HINT) {
    dot.className = 'dot';
    statusText.textContent = 'Falta tu clave de Groq. Pegala abajo y guardala.';
    return;
  }
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: 'Bearer ' + apiKey }
    });
    if (res.ok) {
      dot.className = 'dot ok';
      statusText.textContent = 'Clave válida. Probá el análisis end-to-end abajo.';
    } else {
      dot.className = 'dot bad';
      statusText.textContent = 'La clave no funciona (HTTP ' + res.status + '). Revisala.';
    }
  } catch {
    dot.className = 'dot bad';
    statusText.textContent = 'No se pudo conectar para validar la clave.';
  }
}

function showMsg(text, isError) {
  msg.textContent = text;
  msg.className = isError ? 'msg err' : 'msg';
  clearTimeout(showMsg._t);
  showMsg._t = setTimeout(() => {
    msg.textContent = '';
  }, 3000);
}

init();

async function init() {
  const { apiKey } = await getStored();
  if (apiKey && apiKey !== DEFAULT_KEY_HINT) {
    input.value = apiKey;
  }
  checkKey();
}

saveBtn.addEventListener('click', async () => {
  const value = input.value.trim().replace(/^['"]|['"]$/g, '');
  if (!value) {
    showMsg('Escribí una clave primero.', true);
    return;
  }
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: 'Bearer ' + value }
    });
    if (!res.ok) {
      showMsg('Esa clave no funciona. Verificá que sea de Groq.', true);
      return;
    }
  } catch {
    showMsg('No se pudo validar. Guardamos igual la clave.', true);
  }
  await api.storage.local.set({ apiKey: value });
  checkKey();
  showMsg('Clave guardada. ¡A cazar humo!');
});

resetBtn.addEventListener('click', async () => {
  await api.storage.local.remove('apiKey');
  input.value = '';
  checkKey();
  showMsg('Clave eliminada. Pegá una nueva para seguir usando AntiHumo.');
});

testBtn.addEventListener('click', async () => {
  testBtn.disabled = true;
  showMsg('Probando análisis real con el modelo…');
  try {
    const res = await runtimeSendMessage({ action: 'analyze', title: TEST_TITLE, body: TEST_BODY });
    if (!res || res.error) {
      showMsg('Falló: ' + ((res && res.error) || 'sin respuesta del background'), true);
    } else {
      const verdict = res.verdict ? ' (veredicto: ' + res.verdict + ')' : ' (sin veredicto parseable)';
      showMsg('OK con ' + (res.model || 'modelo desconocido') + verdict);
      dot.className = 'dot ok';
      statusText.textContent = 'Análisis end-to-end funcionando.';
    }
  } catch (e) {
    showMsg('Falló: ' + String((e && e.message) || e), true);
  }
  testBtn.disabled = false;
});

toggleBtn.addEventListener('click', () => {
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  toggleBtn.textContent = isPassword ? '🙈' : '👁';
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});