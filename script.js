const historyEl = document.getElementById('history');
const statusEl = document.getElementById('status');
const echoPanel = document.getElementById('echoPanel');
const sendBtn = document.getElementById('sendBtn');
const resetBtn = document.getElementById('resetBtn');
const messageInput = document.getElementById('msg');
const temperatureInput = document.getElementById('temperature');
const topPInput = document.getElementById('top_p');
const maxTokensInput = document.getElementById('max_tokens');
const wordCloudEl = document.getElementById('wordcloud-container');
const metaphorBadge = document.getElementById('metaphorBadge');
const dataModeEl = document.getElementById('dataMode');
const debugToggleBtn = document.getElementById('debugToggle');
const nebiusStatusEl = document.getElementById('nebiusStatus');
const nebiusOutputEl = document.getElementById('nebiusOutput');

// --- MOCK API REPLACEMENT FOR DEV --- //
const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
let USE_MOCK = isLocalhost;
let ENABLE_NEBIUS = false; // passe à true uniquement quand la clé est configurée côté serveur

let mockMemory = {}; // {mot: count}

const FRENCH_STOPWORDS = new Set([
  'je', 'j', 'suis', 'ai', 'de', 'le', 'la', 'les', 'du', 'des', 'et', 'en', 'au', 'aux'
]);

function normalizeWord(word) {
  return word
    .normalize('NFD')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .toLowerCase();
}

function isStopword(word) {
  return FRENCH_STOPWORDS.has(word);
}

function mock(message) {
  const words = message
    .split(/\s+/)
    .map(normalizeWord)
    .filter(Boolean)
    .filter((w) => !isStopword(w));

  if (words.length === 0) {
    return {
      pivot: '',
      noyau: [],
      peripherie: [],
      cooccurrences: {},
      metaphor: 'brume',
      mock: true,
    };
  }

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
  const intensity = Object.values(mockMemory).reduce((a, b) => a + b, 0);
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
const BASE_FONT_SIZES = {
  pivot: 32,
  noyau: 22,
  peripherie: 16,
};
const RADII = {
  pivot: 0,
  noyau: 110,
  peripherie: 170,
};
const DRIFT_INTENSITY = {
  pivot: 4,
  noyau: 9,
  peripherie: 14,
};

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
  const modeLabel = ENABLE_NEBIUS
    ? 'Nebius activé — requêtes /api/chat'
    : USE_MOCK
      ? 'MOCK local (mockMemory)'
      : 'Requêtes /api/echo sans Nebius';
  dataModeEl.textContent = `Mode API: ${modeLabel}`;
}

function computeNebiusStatusLabel() {
  return ENABLE_NEBIUS
    ? 'Nebius activé — clé API détectée'
    : USE_MOCK
      ? 'Nebius non activé — mode développement MOCK'
      : 'Nebius non activé — API locale /api/echo';
}

function applyRuntimeConfig({ nebiusEnabled, forceMock }) {
  ENABLE_NEBIUS = Boolean(nebiusEnabled);

  if (ENABLE_NEBIUS) {
    USE_MOCK = false; // on passe automatiquement en mode API réel quand la clé est dispo
  } else if (typeof forceMock === 'boolean') {
    USE_MOCK = forceMock;
  }

  setDataMode();
  displayNebiusStatus(computeNebiusStatusLabel());
  displayNebiusOutput(ENABLE_NEBIUS ? null : { mock: true });
}

async function bootstrapRuntimeConfig() {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Healthcheck indisponible');
    const data = await res.json();
    const nebiusEnabled = Boolean(data?.nebius?.enabled);
    applyRuntimeConfig({ nebiusEnabled });
  } catch (error) {
    console.warn('Impossible de récupérer la configuration runtime:', error.message);
    applyRuntimeConfig({ nebiusEnabled: false, forceMock: USE_MOCK });
  }
}

function filterWordList(list) {
  return (list || [])
    .map(normalizeWord)
    .filter(Boolean)
    .filter((w) => !isStopword(w));
}

function toggleDebugPanels(show) {
  document.querySelectorAll('.debug-section').forEach((section) => {
    section.setAttribute('aria-hidden', show ? 'false' : 'true');
  });
  if (debugToggleBtn) {
    debugToggleBtn.textContent = show ? 'Masquer les détails techniques' : 'Afficher les détails techniques';
    debugToggleBtn.setAttribute('aria-expanded', show ? 'true' : 'false');
  }
}

function resetConversation() {
  conversation.length = 0;
  renderHistory();
  echoPanel.textContent = "En attente d'un premier message...";
  setStatus('Prêt à dialoguer (modèle Qwen/Qwen3-32B).');
  displayNebiusStatus(computeNebiusStatusLabel());
  displayNebiusOutput(ENABLE_NEBIUS ? null : { mock: true });
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

function upsertWord(word, category, metrics) {
  if (!word) return;
  const key = word.toLowerCase();
  let entry = cloudState.get(key);

  if (!entry) {
    const element = document.createElement('span');
    element.className = `word ${category}`;
    element.textContent = word;
    element.dataset.category = category;
    wordCloudEl.appendChild(element);
    const angle = (hashWord(word) % 360) * (Math.PI / 180);
    entry = {
      element,
      lastSeen: Date.now(),
      category,
      angle,
      baseRadius: RADII[category] || 0,
      driftSeed: (hashWord(word) % 1000) / 1000,
      forceOffset: 0,
    };
    cloudState.set(key, entry);
  } else {
    entry.category = category;
    entry.element.className = `word ${category}`;
    entry.element.textContent = word;
    entry.lastSeen = Date.now();
    entry.element.classList.remove('word-expiring');
    entry.baseRadius = RADII[category] || entry.baseRadius;
  }

  applyWordMetrics(entry, metrics);
  setPlaceholderVisibility();
}

function hashWord(word) {
  let hash = 0;
  for (let i = 0; i < word.length; i += 1) {
    hash = (hash << 5) - hash + word.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function applyWordMetrics(entry, metrics = {}) {
  const word = entry.element.textContent.toLowerCase();
  const deltaMap = metrics.delta || {};
  const stabilityMap = metrics.stabilite || metrics.stability || {};
  const forceMap = metrics.forceLiens || {};

  const delta = Number(deltaMap[word] || 0);
  const stability = Number(stabilityMap[word] || 0);

  const baseSize = BASE_FONT_SIZES[entry.category] || 16;
  const sizeBoost = Math.max(-0.5, Math.min(0.8, delta * 0.12));
  entry.element.style.fontSize = `${Math.max(10, baseSize * (1 + sizeBoost))}px`;

  const opacity = 0.3 + Math.min(stability, 6) / 6 * 0.7;
  entry.element.style.opacity = Math.min(1, opacity).toFixed(2);

  const strongestLink = Object.entries(forceMap)
    .filter(([pair]) => {
      const [a, b] = pair.split('-');
      return a === word || b === word;
    })
    .sort(([, wA], [, wB]) => Number(wB) - Number(wA))[0];

  entry.forceOffset = strongestLink ? Math.max(0, Number(strongestLink[1]) - 0.5) * 30 : 0;

  const scale = 1 + Math.max(-0.25, Math.min(0.4, delta * 0.05));
  entry.element.style.setProperty('--scale', scale.toFixed(2));
}

function setWordPosition(entry, time) {
  const drift = DRIFT_INTENSITY[entry.category] || 6;
  const wobble = Math.sin(time / 2000 + entry.driftSeed * 8) * drift;
  const lightShake = Math.cos(time / 2500 + entry.driftSeed * 5) * (entry.category === 'pivot' ? 2 : 6);
  const radius = (entry.baseRadius + entry.forceOffset + wobble) / 2.2;
  const angle = entry.angle + Math.sin(time / 3200 + entry.driftSeed * 10) * 0.45;
  const x = 50 + Math.cos(angle) * radius + lightShake * 0.1;
  const y = 50 + Math.sin(angle) * radius + lightShake * 0.1;

  entry.element.style.setProperty('--x', `${x}%`);
  entry.element.style.setProperty('--y', `${y}%`);
}

function animateWords(time) {
  cloudState.forEach((entry) => setWordPosition(entry, time || performance.now()));
  requestAnimationFrame(animateWords);
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

function applyMetaphorStyle(metaphor) {
  wordCloudEl.classList.remove(...METAPHOR_CLASSES.map((m) => `metaphor-${m}`));
  if (metaphor && METAPHOR_CLASSES.includes(metaphor)) {
    wordCloudEl.classList.add(`metaphor-${metaphor}`);
  }
  metaphorBadge.textContent = metaphor || '—';
}

function updateWordCloudFromEcho(data) {
  const pivotWords = filterWordList(data?.pivot ? [data.pivot] : []);
  const noyauWords = filterWordList(Array.isArray(data?.noyau) ? data.noyau : []);
  const peripherieWords = filterWordList(Array.isArray(data?.peripherie) ? data.peripherie : []);

  const metrics = {
    delta: data?.delta || {},
    stabilite: data?.stabilite || data?.stability || {},
    forceLiens: data?.forceLiens || {},
  };

  pivotWords.forEach((w) => upsertWord(w, 'pivot', metrics));
  noyauWords.forEach((w) => upsertWord(w, 'noyau', metrics));
  peripherieWords.forEach((w) => upsertWord(w, 'peripherie', metrics));

  applyMetaphorStyle(data?.metaphor);

  // réapplique les métriques aux mots existants pour refléter la stabilité/delta actuelle
  cloudState.forEach((entry) => applyWordMetrics(entry, metrics));
}

function resetWordCloud() {
  cloudState.forEach((entry) => entry.element.remove());
  cloudState.clear();
  setPlaceholderVisibility();
  applyMetaphorStyle(null);
}

function formatCooccurrences(coocc) {
  if (!coocc || typeof coocc !== 'object') return '—';
  const entries = Object.entries(coocc);
  return entries.length === 0
    ? '—'
    : entries.map(([pair, count]) => `${pair}: ${count}`).join(', ');
}

function formatTopMap(mapObj, limit = 6) {
  if (!mapObj || typeof mapObj !== 'object') return '—';
  const pairs = Object.entries(mapObj)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, limit)
    .map(([key, val]) => `${key}: ${Number(val).toFixed(2)}`);
  return pairs.length ? pairs.join(', ') : '—';
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
    echoPanel.textContent = `Source: ${origin}\nPivot: ${data.pivot ?? '—'}\nNoyau: ${(data.noyau || []).join(', ')}\nPériphérie: ${(data.peripherie || []).join(', ')}\nCooccurrences: ${formatCooccurrences(data.cooccurrences)}\nDelta (croissance): ${formatTopMap(data.delta)}\nStabilité: ${formatTopMap(data.stabilite || data.stability)}\nForce liens: ${formatTopMap(data.forceLiens)}\nMétaphore: ${data.metaphor || '—'}\n\nÉcho: ${data.echo || '(silence)'}${data.question ? `\nQuestion: ${data.question}` : ''}`;
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
    displayNebiusStatus(data.mock ? computeNebiusStatusLabel() : 'Nebius activé — clé API présente');
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

let debugOpen = false;
toggleDebugPanels(debugOpen);
if (debugToggleBtn) {
  debugToggleBtn.addEventListener('click', () => {
    debugOpen = !debugOpen;
    toggleDebugPanels(debugOpen);
  });
}

setPlaceholderVisibility();
renderHistory();
bootstrapRuntimeConfig().finally(() => resetConversation());
setInterval(cleanupWords, 2000);
requestAnimationFrame(animateWords);
