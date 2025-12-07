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
const wordMemoryResetBtn = document.getElementById('wordMemoryReset');
const dataModeEl = document.getElementById('dataMode');
const debugToggleBtn = document.getElementById('debugToggle');
const nebiusStatusEl = document.getElementById('nebiusStatus');
const nebiusOutputEl = document.getElementById('nebiusOutput');
const modeToggleBtn = document.getElementById('modeToggle');
const graphContainerEl = document.getElementById('graph-container');
const graphSvg = document.getElementById('resonantGraph');
const resonanceModeEl = document.getElementById('resonanceMode');
const poetryLevelInput = document.getElementById('poetryLevel');
const poetryLabel = document.getElementById('poetryLabel');

// --- MOCK API REPLACEMENT FOR DEV --- //
const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
let USE_MOCK = isLocalhost;
let ENABLE_NEBIUS = false; // passe à true uniquement quand la clé est configurée côté serveur
let RESONANCE_MODE = 'raw';

const resonanceHistory = [];

let mockMemory = {}; // {mot: count}

const FRENCH_STOPWORDS = new Set([
  'je', 'j', 'suis', 'ai', 'de', 'le', 'la', 'les', 'du', 'des', 'et', 'en', 'au', 'aux',
  'un', 'une', 'd', 'dans', 'pour', 'par', 'que'
]);

const SYSTEM_PROMPT = `Tu réponds en français, en posture d’écoute transverse.
Tu ne commentes jamais ton raisonnement interne.
Tu ne dis jamais ce que tu vas faire.
Tu ne donnes aucun conseil.
Tu reformules, explores, questionnes ce qui résonne.
Tu ne mentionnes jamais être un modèle.
Tu ne produis aucune phrase contenant : 'je dois', 'je vais', 'okay the user', 'as a model'.`;

const METAPHOR_IMAGES = {
  brume: [
    "comme une brume légère qui tarde à se lever",
    "une nappe de brouillard qui adoucit les contours",
    "un voile pâle suspendu entre le dedans et le dehors",
  ],
  orage: [
    "comme un orage qui gronde derrière la colline",
    "un ciel chargé d'étincelles et de tension sourde",
    "des nuages lourds prêts à éclater en éclairs bleutés",
  ],
  eclaircie: [
    "comme une éclaircie dorée après la pluie",
    "un souffle tiède qui entrouvre les nuages",
    "des rais de lumière qui filent entre les branches",
  ],
};

const WORD_MEMORY_KEY = 'resonant-word-memory';
const WORD_FADE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
let wordMemory = {};
let lastPivot = '';

function normalizeWord(word) {
  return word
    .normalize('NFD')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .toLowerCase();
}

function isStopword(word) {
  return FRENCH_STOPWORDS.has(word);
}

function loadMemory() {
  try {
    const raw = localStorage.getItem(WORD_MEMORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.entries(parsed).reduce((acc, [key, value]) => {
      if (value && typeof value.count === 'number' && typeof value.lastSeen === 'number') {
        acc[key] = { count: value.count, lastSeen: value.lastSeen };
      }
      return acc;
    }, {});
  } catch (error) {
    console.warn('Mémoire locale corrompue, réinitialisation.', error);
    return {};
  }
}

function saveMemory() {
  try {
    localStorage.setItem(WORD_MEMORY_KEY, JSON.stringify(wordMemory));
  } catch (error) {
    console.warn('Impossible de sauvegarder la mémoire locale', error);
  }
}

function pickFromArray(list = []) {
  if (!Array.isArray(list) || list.length === 0) return '';
  return list[Math.floor(Math.random() * list.length)];
}

function describePoetryLevel(level = 1) {
  if (level === 0) return 'ton neutre, phrases contenues';
  if (level === 2) return 'registre hypno-poétique, images étoffées, phrases allongées';
  return 'légère musicalité, quelques images souples';
}

function buildMetaphorLine(metaphor, level = 1) {
  const allowed = Object.keys(METAPHOR_IMAGES);
  const key = allowed.includes(metaphor) ? metaphor : 'brume';
  const base = pickFromArray(METAPHOR_IMAGES[key]) || 'comme un souffle discret.';
  if (level === 0) return base;
  if (level === 2) return `${base}, aux contours qui s'étirent et se teintent de reflets mouvants.`;
  return `${base}, avec une douceur feutrée.`;
}

function buildNarrativeEcho(pivot, level = 1) {
  if (!pivot) {
    return 'Ces mots flottent sans ancre précise, comme un courant qui cherche sa rive.';
  }

  const stem = `Ces mots semblent tourner autour de «${pivot}»`;
  if (level === 0) return `${stem}, en cercle calme.`;
  if (level === 2) return `${stem}, traçant des volutes lentes qui tressent un halo vibrant autour de ce terme.`;
  return `${stem}, comme un souffle qui insiste doucement.`;
}

function buildOpenQuestion(pivot) {
  if (!pivot) return "Qu'est-ce qui cherche à se dire juste derrière ces mots ?";
  return `Qu'est-ce qui frémit derrière «${pivot}», à peine formulé ?`;
}

function summarizeResonance(history = []) {
  const recent = history.slice(-3).filter((item) => item && (item.pivot || (item.noyau || []).length));
  if (recent.length === 0) return 'Pivots récurrents : (pas encore de résonance).\nTrame émergente : une page encore blanche.';

  const pivotCounts = recent.reduce((acc, item) => {
    if (item.pivot) acc[item.pivot] = (acc[item.pivot] || 0) + 1;
    return acc;
  }, {});
  const topPivots = Object.entries(pivotCounts)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 3)
    .map(([pivot]) => pivot);

  const noyauTerms = new Set();
  recent.forEach((item) => {
    (item.noyau || []).slice(0, 3).forEach((n) => noyauTerms.add(n));
  });

  const line1 = topPivots.length
    ? `Pivots récurrents : ${topPivots.join(', ')}.`
    : 'Pivots récurrents : encore indécis.';

  const line2 = recent.find((item) => item.resume_courant)?.resume_courant
    || (noyauTerms.size ? `Trame émergente : ${Array.from(noyauTerms).join(', ')}.` : 'Trame émergente : en murmure.');

  return `${line1}\n${line2}`;
}

function buildPrompt(dataEcho = {}, userMessage = '', options = {}) {
  const { history = [], poetryLevel = 1 } = options;
  const summary = summarizeResonance(history);
  const narrativeEcho = buildNarrativeEcho(dataEcho?.pivot, poetryLevel);
  const metaphorLine = buildMetaphorLine(dataEcho?.metaphor, poetryLevel);
  const openQuestion = buildOpenQuestion(dataEcho?.pivot);
  const poetryDescriptor = describePoetryLevel(poetryLevel);

  return `------------------------------------------------------
CONTEXTE DES RÉSONANCES PRÉCÉDENTES :
${summary}

ÉCHO NARRATIF :
${narrativeEcho}

IMAGE MÉTAPHORIQUE :
${metaphorLine}

QUESTION D'OUVERTURE :
${openQuestion}

PAROLE DÉPOSÉE :
"${userMessage}"

RÉPONDS :
- en français
- avec nuance (${poetryDescriptor})
- en 6 à 12 lignes
- en phrases complètes, imagées, mais lisibles
- sans méta-commentaire
- sans te référer à toi-même
- sans donner de conseils ni solutions
------------------------------------------------------`;
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
const METAPHOR_CLASSES = ['brume', 'orage', 'eclaircie'];

const GRAPH_RADII = {
  pivot: 0,
  noyau: 150,
  peripherie: 220,
};

const GRAPH_CENTER = { x: 320, y: 210 };
const graphState = new Map();
const graphLinks = [];

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

function setToggleState(useNebius) {
  if (!modeToggleBtn) return;
  modeToggleBtn.setAttribute('aria-pressed', useNebius ? 'true' : 'false');
  modeToggleBtn.classList.toggle('is-on', useNebius);
}

function setResonanceMode(mode) {
  RESONANCE_MODE = mode === 'enriched' ? 'enriched' : 'raw';
  if (!resonanceModeEl) return;
  resonanceModeEl.querySelectorAll('.pill').forEach((btn) => {
    const isActive = btn.dataset.mode === RESONANCE_MODE;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function setPoetryLabel(level = 1) {
  if (!poetryLabel) return;
  const descriptions = ['Neutre — phrases concises', 'Léger — phrases plus souples', 'Hypno — images dilatées'];
  poetryLabel.textContent = descriptions[level] || descriptions[1];
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

  setToggleState(ENABLE_NEBIUS);
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

function renderWordcloud() {
  if (!wordCloudEl) return;
  wordCloudEl.innerHTML = '';

  const entries = Object.entries(wordMemory);
  if (entries.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder small';
    placeholder.textContent = '— En attente des premiers mots résonants…';
    wordCloudEl.appendChild(placeholder);
    return;
  }

  const maxCount = Math.max(...entries.map(([, info]) => info.count), 1);
  const now = Date.now();

  entries
    .sort((a, b) => {
      if (a[0] === lastPivot) return -1;
      if (b[0] === lastPivot) return 1;
      return Number(b[1].count) - Number(a[1].count) || a[0].localeCompare(b[0]);
    })
    .forEach(([word, info]) => {
      const size = 0.8 + (Number(info.count) / maxCount) * (2.2 - 0.8);
      const token = document.createElement('span');
      token.className = 'word-token';
      token.textContent = word;
      token.style.fontSize = `${size.toFixed(2)}rem`;
      if (word === lastPivot) token.classList.add('pivot');
      if (now - info.lastSeen > WORD_FADE_THRESHOLD) token.classList.add('faded');
      wordCloudEl.appendChild(token);
    });
}

function updateMemoryWithEcho(data = {}) {
  const now = Date.now();
  const incoming = [];

  if (data?.pivot) incoming.push({ word: data.pivot, category: 'pivot' });
  (Array.isArray(data?.noyau) ? data.noyau : []).forEach((word) => incoming.push({ word, category: 'noyau' }));
  (Array.isArray(data?.peripherie) ? data.peripherie : []).forEach((word) => incoming.push({ word, category: 'peripherie' }));

  incoming.forEach(({ word, category }) => {
    const normalized = normalizeWord(word);
    if (!normalized || isStopword(normalized)) return;
    const current = wordMemory[normalized] || { count: 0, lastSeen: now };
    wordMemory[normalized] = { count: current.count + 1, lastSeen: now };
    if (category === 'pivot') {
      lastPivot = normalized;
    }
  });

  saveMemory();
  renderWordcloud();
}

function clearMemory() {
  wordMemory = {};
  lastPivot = '';
  saveMemory();
  applyMetaphorStyle(null);
  renderWordcloud();
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
  resonanceHistory.length = 0;
  renderHistory();
  echoPanel.textContent = "En attente d'un premier message...";
  setStatus('Prêt à dialoguer (modèle google/gemma-2-2b-it).');
  displayNebiusStatus(computeNebiusStatusLabel());
  displayNebiusOutput(ENABLE_NEBIUS ? null : { mock: true });
  clearMemory();
  resetGraph();
  if (USE_MOCK) {
    mockMemory = {};
  }
}

function strongestLinkOffset(word, forceMap = {}) {
  const strongestLink = Object.entries(forceMap)
    .filter(([pair]) => {
      const [a, b] = pair.split('-');
      return a === word || b === word;
    })
    .sort(([, wA], [, wB]) => Number(wB) - Number(wA))[0];

  return strongestLink ? Math.max(0, Number(strongestLink[1]) - 0.5) * 28 : 0;
}

function ensureGraphLayers() {
  if (!graphSvg) return null;
  let linksLayer = graphSvg.querySelector('g[data-layer="links"]');
  let nodesLayer = graphSvg.querySelector('g[data-layer="nodes"]');

  if (!linksLayer) {
    linksLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    linksLayer.dataset.layer = 'links';
    graphSvg.appendChild(linksLayer);
  }

  if (!nodesLayer) {
    nodesLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodesLayer.dataset.layer = 'nodes';
    graphSvg.appendChild(nodesLayer);
  }

  return { linksLayer, nodesLayer };
}

function upsertGraphNode(word, category, metrics, forceMap) {
  if (!graphSvg) return null;
  const layers = ensureGraphLayers();
  if (!layers) return null;

  const key = word.toLowerCase();
  let entry = graphState.get(key);

  if (!entry) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');

    circle.classList.add('graph-node');
    label.classList.add('graph-label');
    label.textContent = word;

    group.appendChild(circle);
    group.appendChild(label);
    layers.nodesLayer.appendChild(group);

    entry = {
      group,
      circle,
      label,
      angle: (hashWord(word) % 360) * (Math.PI / 180),
      driftSeed: (hashWord(word) % 1000) / 1000,
      forceOffset: 0,
      x: GRAPH_CENTER.x,
      y: GRAPH_CENTER.y,
    };
    graphState.set(key, entry);
  }

  entry.category = category;
  entry.group.dataset.category = category;
  entry.circle.dataset.category = category;
  entry.label.textContent = word;

  const deltaMap = metrics.delta || {};
  const stabilityMap = metrics.stabilite || metrics.stability || {};
  const delta = Number(deltaMap[word] || 0);
  const stability = Number(stabilityMap[word] || 0);

  const radius = 10 + Math.max(0, delta) * 1.4;
  entry.circle.setAttribute('r', Math.min(26, radius).toFixed(2));
  const opacity = 0.35 + Math.min(1, stability / 5) * 0.6;
  entry.circle.style.opacity = Math.min(1, opacity).toFixed(2);

  entry.forceOffset = strongestLinkOffset(word, forceMap);
  entry.baseRadius = GRAPH_RADII[category] ?? GRAPH_RADII.peripherie;
  entry.lastSeen = Date.now();
  return entry;
}

function removeStaleGraphNodes(activeWords) {
  graphState.forEach((entry, key) => {
    if (!activeWords.has(key)) {
      entry.group.remove();
      graphState.delete(key);
    }
  });
}

function renderGraphLinks(forceMap = {}) {
  if (!graphSvg) return;
  const layers = ensureGraphLayers();
  if (!layers) return;

  layers.linksLayer.innerHTML = '';
  graphLinks.length = 0;

  Object.entries(forceMap).forEach(([pair, weight]) => {
    const [rawA, rawB] = pair.split('-');
    if (!rawA || !rawB) return;
    const a = rawA.toLowerCase();
    const b = rawB.toLowerCase();

    const source = graphState.get(a);
    const target = graphState.get(b);
    if (!source || !target) return;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add('graph-link');
    const width = 1 + Math.max(0.2, Number(weight) || 0) * 0.8;
    line.style.strokeWidth = width.toFixed(2);
    line.style.strokeOpacity = (0.35 + Math.min(0.45, Number(weight) / 4)).toFixed(2);
    layers.linksLayer.appendChild(line);
    graphLinks.push({ line, source, target });
  });
}

function updateGraphFromEcho(data) {
  if (!graphSvg) return;

  const pivotWords = filterWordList(data?.pivot ? [data.pivot] : []);
  const noyauWords = filterWordList(Array.isArray(data?.noyau) ? data.noyau : []);
  const peripherieWords = filterWordList(Array.isArray(data?.peripherie) ? data.peripherie : []);

  const metrics = {
    delta: data?.delta || {},
    stabilite: data?.stabilite || data?.stability || {},
    forceLiens: data?.forceLiens || {},
  };

  const activeWords = new Set();
  const forceMap = metrics.forceLiens;

  pivotWords.forEach((w) => { upsertGraphNode(w, 'pivot', metrics, forceMap); activeWords.add(w); });
  noyauWords.forEach((w) => { upsertGraphNode(w, 'noyau', metrics, forceMap); activeWords.add(w); });
  peripherieWords.forEach((w) => { upsertGraphNode(w, 'peripherie', metrics, forceMap); activeWords.add(w); });

  removeStaleGraphNodes(activeWords);
  renderGraphLinks(forceMap);
}

function resetGraph() {
  graphLinks.length = 0;
  graphState.forEach((entry) => entry.group.remove());
  graphState.clear();
  if (graphSvg) {
    graphSvg.innerHTML = '';
  }
}

function animateGraph(time) {
  const now = time || performance.now();
  graphState.forEach((entry) => {
    const wobble = Math.sin(now / 2400 + entry.driftSeed * 8) * (entry.category === 'pivot' ? 6 : 12);
    const sway = Math.cos(now / 2800 + entry.driftSeed * 5) * (entry.category === 'pivot' ? 2 : 6);
    const radius = (entry.baseRadius || 0) + entry.forceOffset + wobble;
    const angle = entry.angle + Math.sin(now / 3200 + entry.driftSeed * 6) * 0.35;
    const x = GRAPH_CENTER.x + Math.cos(angle) * radius;
    const y = GRAPH_CENTER.y + Math.sin(angle) * radius * 0.88 + sway;

    entry.x = x;
    entry.y = y;

    entry.circle.setAttribute('cx', x.toFixed(2));
    entry.circle.setAttribute('cy', y.toFixed(2));
    entry.label.setAttribute('x', x.toFixed(2));
    entry.label.setAttribute('y', (y + 4).toFixed(2));
  });

  graphLinks.forEach(({ line, source, target }) => {
    line.setAttribute('x1', (source?.x ?? GRAPH_CENTER.x).toFixed(2));
    line.setAttribute('y1', (source?.y ?? GRAPH_CENTER.y).toFixed(2));
    line.setAttribute('x2', (target?.x ?? GRAPH_CENTER.x).toFixed(2));
    line.setAttribute('y2', (target?.y ?? GRAPH_CENTER.y).toFixed(2));
  });

  requestAnimationFrame(animateGraph);
}

function applyMetaphorStyle(metaphor) {
  wordCloudEl.classList.remove(...METAPHOR_CLASSES.map((m) => `metaphor-${m}`));
  if (graphContainerEl) {
    graphContainerEl.classList.remove(...METAPHOR_CLASSES.map((m) => `metaphor-${m}`));
  }

  if (metaphor && METAPHOR_CLASSES.includes(metaphor)) {
    wordCloudEl.classList.add(`metaphor-${metaphor}`);
    if (graphContainerEl) {
      graphContainerEl.classList.add(`metaphor-${metaphor}`);
    }
  }
  metaphorBadge.textContent = metaphor || '—';
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

function pushResonanceHistory(data) {
  if (!data) return;
  resonanceHistory.push(data);
  if (resonanceHistory.length > 12) {
    resonanceHistory.shift();
  }
}

function renderEchoData(data, origin = '/api/echo') {
  if (!data) return;
  const originLabel = data.mock ? 'MOCK local' : origin;
  echoPanel.textContent = `Source: ${originLabel}\nPivot: ${data.pivot ?? '—'}\nNoyau: ${(data.noyau || []).join(', ')}\nPériphérie: ${(data.peripherie || []).join(', ')}\nCooccurrences: ${formatCooccurrences(data.cooccurrences)}\nDelta (croissance): ${formatTopMap(data.delta)}\nStabilité: ${formatTopMap(data.stabilite || data.stability)}\nForce liens: ${formatTopMap(data.forceLiens)}\nMétaphore: ${data.metaphor || '—'}\n\nÉcho: ${data.echo || '(silence)'}${data.question ? `\nQuestion: ${data.question}` : ''}`;
  updateMemoryWithEcho(data);
  applyMetaphorStyle(data?.metaphor);
  updateGraphFromEcho(data);
  pushResonanceHistory(data);
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

async function updateEcho(message, existingData = null) {
  try {
    const data = existingData || await callResonanceAPI(message);
    renderEchoData(data, existingData ? 'Réemploi' : '/api/echo');
    return data;
  } catch (error) {
    echoPanel.textContent = 'Analyse impossible: ' + error.message;
    return null;
  }
}

function toggleApiMode() {
  ENABLE_NEBIUS = !ENABLE_NEBIUS;
  USE_MOCK = !ENABLE_NEBIUS;
  setToggleState(ENABLE_NEBIUS);
  setDataMode();
  displayNebiusStatus(computeNebiusStatusLabel());
  displayNebiusOutput(ENABLE_NEBIUS ? null : { mock: true });
  setStatus(ENABLE_NEBIUS ? 'Nebius activé — prêt à répondre.' : 'Mode MOCK actif — réponses simulées.');
}

async function sendMessage() {
  const content = messageInput.value.trim();
  if (!content) return;

  conversation.push({ role: 'user', content });
  renderHistory();
  messageInput.value = '';
  setStatus(ENABLE_NEBIUS ? '⏳ Envoi au modèle Nebius...' : '⏳ Réponse simulée (Nebius désactivé)...');
  sendBtn.disabled = true;

  const poetryLevel = Number(poetryLevelInput?.value) || 1;
  let echoData = null;
  try {
    echoData = await callResonanceAPI(content);
    renderEchoData(echoData);
  } catch (error) {
    echoPanel.textContent = 'Analyse impossible: ' + error.message;
  }

  const useResonantPrompt = RESONANCE_MODE === 'enriched' && echoData;
  const enrichedMessage = useResonantPrompt
    ? buildPrompt(echoData, content, { history: resonanceHistory, poetryLevel })
    : content;

  const messagesForModel = conversation.map((entry, idx) => {
    const isLastUser = idx === conversation.length - 1 && entry.role === 'user';
    if (useResonantPrompt && isLastUser) {
      return { ...entry, content: enrichedMessage };
    }
    return entry;
  });

  const payload = {
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messagesForModel],
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
      : `✅ Réponse du modèle ${data.model || 'google/gemma-2-2b-it'} (messages envoyés: ${data.messagesSent || 'n/a'})`;
    setStatus(statusText);
    displayNebiusStatus(data.mock ? computeNebiusStatusLabel() : 'Nebius activé — clé API présente');
    displayNebiusOutput(data);
    if (!echoData) {
      updateEcho(content);
    }
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
if (wordMemoryResetBtn) {
  wordMemoryResetBtn.addEventListener('click', () => clearMemory());
}
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

if (modeToggleBtn) {
  modeToggleBtn.addEventListener('click', toggleApiMode);
}

if (resonanceModeEl) {
  resonanceModeEl.addEventListener('click', (event) => {
    const btn = event.target.closest('.pill');
    if (!btn) return;
    setResonanceMode(btn.dataset.mode);
  });
}

if (poetryLevelInput) {
  setPoetryLabel(Number(poetryLevelInput.value) || 1);
  poetryLevelInput.addEventListener('input', (event) => {
    const level = Number(event.target.value) || 1;
    setPoetryLabel(level);
  });
}

wordMemory = loadMemory();
renderWordcloud();
renderHistory();
setResonanceMode(RESONANCE_MODE);
bootstrapRuntimeConfig().finally(() => resetConversation());
requestAnimationFrame(animateGraph);
