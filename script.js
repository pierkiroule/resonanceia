const historyEl = document.getElementById('history');
const statusEl = document.getElementById('status');
const echoPanel = document.getElementById('echoPanel');
const sendBtn = document.getElementById('sendBtn');
const resetBtn = document.getElementById('resetBtn');
const messageInput = document.getElementById('msg');
const temperatureInput = document.getElementById('temperature');
const topPInput = document.getElementById('top_p');
const maxTokensInput = document.getElementById('max_tokens');
const wordCloudEl = document.getElementById('wordCloud');
const metaphorBadge = document.getElementById('metaphorBadge');
const dataModeEl = document.getElementById('dataMode');
const nebiusStatusEl = document.getElementById('nebiusStatus');
const nebiusOutputEl = document.getElementById('nebiusOutput');

// --- MOCK API REPLACEMENT FOR DEV --- //
const USE_MOCK = true;
const ENABLE_NEBIUS = false; // passe à true uniquement quand la clé est configurée

let mockMemory = {}; // {mot: count}

function mock(message) {
  const words = message.toLowerCase().split(/\s+/).filter(Boolean);

  // update memory
  words.forEach(w => {
    mockMemory[w] = (mockMemory[w] || 0) + 1;
  });

  // find pivot = word with highest frequency
  let pivot = words[0];
  for (const w of words) {
    if (mockMemory[w] > (mockMemory[pivot] || 0)) pivot = w;
  }

  // noyau = words seen >1
  const noyau = Object.keys(mockMemory).filter(w => mockMemory[w] > 1);

  // peripherie = words seen once
  const peripherie = Object.keys(mockMemory).filter(w => mockMemory[w] === 1);

  // metaphor logic
  const intensity = Object.values(mockMemory).reduce((a,b)=>a+b,0)
  let metaphor = "brume";
  if (intensity > 6) metaphor = "orage";
  if (words.includes("espoir") || words.includes("lumiere")) metaphor = "eclaircie";

  return {
    pivot,
    noyau,
    peripherie,
    cooccurrences: {}, // not required for mock
    metaphor,
    mock: true
  };
}

const conversation = [];
const cloudState = new Map();
const WORD_LIFETIME = 12000;
const REMOVAL_DURATION = 1200;
const METAPHOR_CLASSES = ['brume', 'orage', 'eclaircie'];

function renderHistory() {
  historyEl.innerHTML = conversation
    .map((entry) => {
      const roleLabel = entry.role === 'assistant' ? 'Assistant' : 'Vous';
      const roleClass = entry.role === 'assistant' ? 'assistant' : 'user';
      return `<div class="message ${roleClass}"><div class="small">${roleLabel}</div><div>${entry.content}</div></div>`;
    })
    .join('');
  historyEl.scrollTop = historyEl.scrollHeight;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function displayNebiusStatus(text) {
  if (nebiusStatusEl) {
    nebiusStatusEl.textContent = text;
  }
}

function displayNebiusOutput(response) {
  if (!nebiusOutputEl) return;
  if (!response) {
    nebiusOutputEl.textContent = '—';
    return;
  }

  if (response.mock) {
    nebiusOutputEl.textContent = 'Réponse simulée';
    return;
  }

  if (typeof response.response === 'string') {
    nebiusOutputEl.textContent = response.response;
    return;
  }

  if (typeof response.reply === 'string') {
    nebiusOutputEl.textContent = response.reply;
    return;
  }

  nebiusOutputEl.textContent = 'Réponse reçue.';
}

function setDataMode() {
  if (!dataModeEl) return;
  dataModeEl.textContent = `Mode API: ${USE_MOCK ? 'MOCK local (mockMemory)' : 'Requête /api/echo'}`;
}

function resetConversation() {
  conversation.length = 0;
  renderHistory();
  echoPanel.textContent = "En attente d'un premier message...";
  setStatus('Prêt à dialoguer (modèle Qwen/Qwen3-32B).');
  displayNebiusStatus('Nebius non activé — mode développement MOCK');
  displayNebiusOutput({ mock: true });
  resetWordCloud();
  if (USE_MOCK) {
    mockMemory = {};
  }
}

function setPlaceholderVisibility() {
  const placeholder = wordCloudEl.querySelector('.placeholder');
  if (cloudState.size === 0) {
    if (!placeholder) {
      const p = document.createElement('div');
      p.className = 'placeholder small';
      p.textContent = 'En attente des premiers mots...';
      wordCloudEl.appendChild(p);
    }
  } else if (placeholder) {
    placeholder.remove();
  }
}

function createWord(word, category) {
  const span = document.createElement('span');
  span.className = `word ${category}`;
  span.textContent = word;
  return span;
}

function upsertWord(word, category) {
  if (!word) return;
  const key = word.toLowerCase();
  let entry = cloudState.get(key);

  if (!entry) {
    const element = createWord(word, category);
    wordCloudEl.appendChild(element);
    entry = { element, lastSeen: Date.now() };
    cloudState.set(key, entry);
  } else {
    entry.element.className = `word ${category}`;
    entry.element.textContent = word;
    entry.lastSeen = Date.now();
    entry.element.classList.remove('word-expiring');
  }

  setPlaceholderVisibility();
}

function cleanupWords() {
  const now = Date.now();
  cloudState.forEach((entry, key) => {
    if (entry.removing) return;
    if (now - entry.lastSeen > WORD_LIFETIME) {
      entry.removing = true;
      entry.element.classList.add('word-expiring');
      setTimeout(() => {
        entry.element.remove();
        cloudState.delete(key);
        setPlaceholderVisibility();
      }, REMOVAL_DURATION);
    }
  });
}

function applyMetaphor(metaphor) {
  wordCloudEl.classList.remove(...METAPHOR_CLASSES.map((m) => `metaphor-${m}`));
  if (metaphor && METAPHOR_CLASSES.includes(metaphor)) {
    wordCloudEl.classList.add(`metaphor-${metaphor}`);
  }
  metaphorBadge.textContent = metaphor || '—';
}

function updateWordCloudFromEcho(data) {
  const pivotWords = data?.pivot ? [data.pivot] : [];
  const noyauWords = Array.isArray(data?.noyau) ? data.noyau : [];
  const peripherieWords = Array.isArray(data?.peripherie) ? data.peripherie : [];

  pivotWords.forEach((w) => upsertWord(w, 'pivot'));
  noyauWords.forEach((w) => upsertWord(w, 'noyau'));
  peripherieWords.forEach((w) => upsertWord(w, 'peripherie'));

  applyMetaphor(data?.metaphor);
}

function resetWordCloud() {
  cloudState.forEach((entry) => entry.element.remove());
  cloudState.clear();
  setPlaceholderVisibility();
  applyMetaphor(null);
}

function formatCooccurrences(coocc) {
  if (!coocc || typeof coocc !== 'object') return '—';
  const entries = Object.entries(coocc);
  return entries.length === 0
    ? '—'
    : entries.map(([pair, count]) => `${pair}: ${count}`).join(', ');
}

function friendlyNebiusError(error) {
  const message = error?.message || 'Nebius indisponible';

  if (!ENABLE_NEBIUS) {
    return 'Nebius non activé — mode développement MOCK';
  }

  if (/NEBIUS_API_KEY/i.test(message)) {
    return 'Nebius non activé — clé API absente';
  }

  return message;
}

async function callNebiusChat(payload) {
  if (!ENABLE_NEBIUS) {
    return { reply: '(simulation Nebius)', model: 'Nebius (mock local)', mock: true };
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  if (!res.ok) {
    let message = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.error) {
        message = parsed.error;
      }
    } catch (_) {
      // ignore JSON parse issues for error bodies
    }
    throw new Error(message || 'Réponse invalide');
  }

  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch (parseError) {
    throw new Error('Réponse Nebius illisible');
  }
  return { ...data, mock: false };
}

async function callResonanceAPI(message) {
  if (USE_MOCK) {
    return Promise.resolve(mock(message));
  }

  const res = await fetch('/api/echo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    throw new Error('Erreur côté écho');
  }

  return res.json();
}

async function updateEcho(message) {
  try {
    const data = await callResonanceAPI(message);
    const origin = data.mock ? 'MOCK local' : '/api/echo';
    echoPanel.textContent = `Source: ${origin}\nPivot: ${data.pivot ?? '—'}\nNoyau: ${(data.noyau || []).join(', ')}\nPériphérie: ${(data.peripherie || []).join(', ')}\nCooccurrences: ${formatCooccurrences(data.cooccurrences)}\nMétaphore: ${data.metaphor || '—'}\n\nÉcho: ${data.echo || '(silence)'}${data.question ? `\nQuestion: ${data.question}` : ''}`;
    updateWordCloudFromEcho(data);
  } catch (error) {
    echoPanel.textContent = 'Analyse impossible: ' + error.message;
  }
}

async function sendMessage() {
  const content = messageInput.value.trim();
  if (!content) return;

  conversation.push({ role: 'user', content });
  renderHistory();
  messageInput.value = '';
  setStatus(ENABLE_NEBIUS ? '⏳ Envoi au modèle Nebius...' : '⏳ Réponse simulée (Nebius désactivé)...');
  sendBtn.disabled = true;

  const payload = {
    messages: conversation,
    temperature: Number(temperatureInput.value) || 0.7,
    top_p: Number(topPInput.value) || 0.9,
    max_tokens: Number(maxTokensInput.value) || 256,
  };

  try {
    const data = await callNebiusChat(payload);
    const reply = data.reply || data.response || '(pas de contenu)';
    conversation.push({ role: 'assistant', content: reply });
    renderHistory();

    const statusText = data.mock
      ? '✅ Réponse simulée (Nebius désactivé).'
      : `✅ Réponse du modèle ${data.model || 'Qwen/Qwen3-32B'} (messages envoyés: ${data.messagesSent || 'n/a'})`;
    setStatus(statusText);
    displayNebiusStatus(data.mock ? 'Nebius non activé — mode développement MOCK' : 'Nebius activé — clé API présente');
    displayNebiusOutput(data);
    updateEcho(content);
  } catch (error) {
    const friendly = friendlyNebiusError(error);
    setStatus('❌ ' + friendly);
    displayNebiusStatus(friendly);
    displayNebiusOutput({ mock: true });
  } finally {
    sendBtn.disabled = false;
  }
}

sendBtn.addEventListener('click', sendMessage);
resetBtn.addEventListener('click', resetConversation);
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    sendMessage();
  }
});

setPlaceholderVisibility();
renderHistory();
setDataMode();
displayNebiusStatus(ENABLE_NEBIUS ? 'Nebius activé — clé API attendue' : 'Nebius non activé — mode développement MOCK');
displayNebiusOutput(ENABLE_NEBIUS ? null : { mock: true });
setInterval(cleanupWords, 2000);
