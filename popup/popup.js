const api = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

const DEFAULT_KEY_HINT = 'gsk_XXXXX';

const dot = document.getElementById('dot');
const statusText = document.getElementById('status-text');
const input = document.getElementById('api-key');
const toggleBtn = document.getElementById('toggle-visibility');
const saveBtn = document.getElementById('save');
const resetBtn = document.getElementById('reset');
const msg = document.getElementById('msg');

async function getStored() {
  return api.storage.local.get('apiKey');
}

async function checkKey() {
  const { apiKey } = await getStored();
  if (!apiKey || apiKey === DEFAULT_KEY_HINT) {
    dot.className = 'dot ok';
    statusText.textContent = 'Con la clave incluida. Todo listo.';
    return;
  }
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: 'Bearer ' + apiKey }
    });
    if (res.ok) {
      dot.className = 'dot ok';
      statusText.textContent = 'Clave propia configurada y funcando.';
    } else {
      dot.className = 'dot bad';
      statusText.textContent = 'La clave propia no funciona. Revisala.';
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
  showMsg('Volviste a la clave incluida.');
});

toggleBtn.addEventListener('click', () => {
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  toggleBtn.textContent = isPassword ? '🙈' : '👁';
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});