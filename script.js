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

// --- MOCK API REPLACEMENT FOR DEV --- //
const USE_MOCK = true;

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

function setDataMode() {
  if (!dataModeEl) return;
  dataModeEl.textContent = `Mode API: ${USE_MOCK ? 'MOCK local (mockMemory)' : 'Requête /api/echo'}`;
}

function resetConversation() {
  conversation.length = 0;
  renderHistory();
  echoPanel.textContent = "En attente d'un premier message...";
  setStatus('Prêt à dialoguer (modèle Qwen/Qwen3-32B).');
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
  setStatus('⏳ Envoi au modèle Nebius...');
  sendBtn.disabled = true;

  const payload = {
    messages: conversation,
    temperature: Number(temperatureInput.value) || 0.7,
    top_p: Number(topPInput.value) || 0.9,
    max_tokens: Number(maxTokensInput.value) || 256,
  };

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Réponse invalide');
    }

    const data = await res.json();
    const reply = data.reply || '(pas de contenu)';
    conversation.push({ role: 'assistant', content: reply });
    renderHistory();
    setStatus(`✅ Réponse du modèle ${data.model || 'Qwen/Qwen3-32B'} (messages envoyés: ${data.messagesSent || 'n/a'})`);
    updateEcho(content);
  } catch (error) {
    setStatus('❌ ' + error.message);
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
setInterval(cleanupWords, 2000);
