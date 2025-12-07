import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

// In-memory defaults to keep the analysis responsive between warm executions
const MEMORY_STATE = {
  matrix: {},
  freq: {},
  history: []
};

const DB_DIR = process.env.RESONANCE_DB_PATH || path.join(process.env.TMPDIR || '/tmp', 'resonanceia');
const MATRIX_PATH = path.join(DB_DIR, 'matrix.json');
const FREQ_PATH = path.join(DB_DIR, 'freq.json');
const HISTORY_PATH = path.join(DB_DIR, 'history.json');

const stopwordsFr = new Set([
  'alors', 'au', 'aucuns', 'aussi', 'autre', 'avant', 'avec', 'avoir', 'bon',
  'car', 'ce', 'cela', 'ces', 'ceux', 'chaque', 'ci', 'comme', 'comment',
  'dans', 'des', 'du', 'dedans', 'dehors', 'depuis', 'deux', 'devrait', 'doit',
  'donc', 'dos', 'droite', 'début', 'elle', 'elles', 'en', 'encore', 'essai',
  'est', 'et', 'eu', 'fait', 'faites', 'fois', 'font', 'force', 'haut', 'hors',
  'ici', 'il', 'ils', 'je', 'juste', 'la', 'le', 'les', 'leur', 'là', 'ma',
  'maintenant', 'mais', 'mes', 'mine', 'moins', 'mon', 'mot', 'même', 'ni',
  'nommés', 'notre', 'nous', 'nouveaux', 'ou', 'où', 'par', 'parce', 'pas',
  'peut', 'peu', 'plupart', 'pour', 'pourquoi', 'quand', 'que', 'quel',
  'quelle', 'quelles', 'quels', 'qui', 'sa', 'sans', 'ses', 'seulement', 'si',
  'sien', 'son', 'sont', 'sous', 'soyez', 'sujet', 'sur', 'ta', 'tandis', 'tel',
  'tels', 'tes', 'ton', 'tous', 'tout', 'trop', 'très', 'tu', 'valeur', 'voie',
  'voient', 'vont', 'votre', 'vous', 'vu', 'ça', 'étaient', 'état', 'étions',
  'été', 'être'
]);

function stripDiacritics(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function tokenize(text = '') {
  const normalized = stripDiacritics(text.toLowerCase());
  const rawTokens = normalized
    .split(/[^a-z\-'’]+/)
    .map((t) => t.replace(/^[\-'’]+|[\-'’]+$/g, ''))
    .filter(Boolean);

  return rawTokens.filter((token) => token.length > 1 && !stopwordsFr.has(token));
}

function countLocal(tokens = []) {
  const counts = new Map();
  tokens.forEach((token) => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });
  return counts;
}

function updateFrequencies(tokens = [], freq = {}) {
  const updated = { ...freq };
  tokens.forEach((token) => {
    updated[token] = (updated[token] || 0) + 1;
  });
  return updated;
}

function updateMatrix(tokens = [], matrix = {}) {
  const updated = { ...matrix };
  for (let i = 0; i < tokens.length; i += 1) {
    const a = tokens[i];
    for (let j = i + 1; j < tokens.length; j += 1) {
      const b = tokens[j];
      if (a === b) continue;
      const first = updated[a] ? { ...updated[a] } : {};
      const second = updated[b] ? { ...updated[b] } : {};
      first[b] = (first[b] || 0) + 1;
      second[a] = (second[a] || 0) + 1;
      updated[a] = first;
      updated[b] = second;
    }
  }
  return updated;
}

function trimToTop(freq = {}, matrix = {}, limit = 200) {
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, limit);
  const kept = new Set(top.map(([word]) => word));
  const trimmedFreq = Object.fromEntries(top);
  const trimmedMatrix = {};

  kept.forEach((word) => {
    const row = matrix[word] || {};
    const filteredRow = {};
    Object.entries(row).forEach(([other, value]) => {
      if (kept.has(other)) {
        filteredRow[other] = value;
      }
    });
    trimmedMatrix[word] = filteredRow;
  });

  return { freq: trimmedFreq, matrix: trimmedMatrix };
}

function calculateCentrality(matrix = {}) {
  const centrality = {};
  Object.entries(matrix).forEach(([word, connections]) => {
    centrality[word] = Object.values(connections || {}).reduce((acc, val) => acc + val, 0);
  });
  return centrality;
}

function buildOrbits(pivot, matrix = {}) {
  if (!pivot) return [];
  const row = matrix[pivot] || {};
  return Object.entries(row)
    .map(([mot, force]) => ({ mot, force }))
    .sort((a, b) => b.force - a.force);
}

function selectPivot(tokens = [], centrality = {}, freq = {}) {
  if (tokens.length) {
    const localCounts = countLocal(tokens);
    let selected = '';
    let maxCount = -Infinity;
    localCounts.forEach((value, key) => {
      if (value > maxCount) {
        maxCount = value;
        selected = key;
      }
    });
    if (selected) return selected;
  }

  const basis = Object.keys(centrality).length ? centrality : freq;
  return Object.entries(basis).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}

function computeDelta(pivot, centrality = {}, history = []) {
  if (!pivot) return 0;
  const previousCentrality = history.at(-1)?.centrality || {};
  const prevValue = previousCentrality[pivot] || 0;
  const current = centrality[pivot] || 0;
  return current - prevValue;
}

function recordHistory(history = [], centrality = {}, freq = {}) {
  const snapshot = {
    timestamp: new Date().toISOString(),
    centrality,
    freq
  };
  const next = [...history, snapshot];
  const MAX = 50;
  return next.slice(-MAX);
}

function craftMetaphor(pivot, orbites = [], variation = 0) {
  const orbitNames = orbites.slice(0, 5).map((o) => o.mot);
  const orbitList = orbitNames.length ? orbitNames.join(', ') : 'aucune orbite immédiate';
  const drift = variation > 0 ? 'brille davantage' : variation < 0 ? "s'atténue" : 'reste stable';

  const metaphore = pivot
    ? `Autour de "${pivot}", le tissu reste co-émergent : ${orbitList}. La résonance ${drift}.`
    : 'Constellation en attente de premiers éclats.';

  const constellation = [
    '🌌 neutralité',
    '🧭 co-émergent',
    "✨ pas d'interprétation",
    `🛰️ delta ${variation >= 0 ? '+' : ''}${variation}`,
    pivot ? `🌠 pivot ${pivot}` : '🌠 pivot latent'
  ];

  return { metaphore, constellation };
}

async function ensureDir() {
  await mkdir(DB_DIR, { recursive: true });
}

async function ensureFile(filePath, fallback) {
  try {
    await readFile(filePath, 'utf8');
  } catch {
    await writeFile(filePath, JSON.stringify(fallback, null, 2));
  }
}

async function ensureStores() {
  await ensureDir();
  await Promise.all([
    ensureFile(MATRIX_PATH, {}),
    ensureFile(FREQ_PATH, {}),
    ensureFile(HISTORY_PATH, [])
  ]);
}

async function readJson(filePath) {
  try {
    const data = await readFile(filePath, 'utf8');
    return JSON.parse(data || 'null');
  } catch {
    return null;
  }
}

async function writeJson(filePath, data) {
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function loadState() {
  const [matrix, freq, history] = await Promise.all([
    readJson(MATRIX_PATH),
    readJson(FREQ_PATH),
    readJson(HISTORY_PATH)
  ]);

  return {
    matrix: matrix || { ...MEMORY_STATE.matrix },
    freq: freq || { ...MEMORY_STATE.freq },
    history: Array.isArray(history) ? history : [...MEMORY_STATE.history]
  };
}

async function saveState({ matrix, freq, history }) {
  MEMORY_STATE.matrix = matrix || {};
  MEMORY_STATE.freq = freq || {};
  MEMORY_STATE.history = history || [];

  try {
    await writeJson(MATRIX_PATH, MEMORY_STATE.matrix);
    await writeJson(FREQ_PATH, MEMORY_STATE.freq);
    await writeJson(HISTORY_PATH, MEMORY_STATE.history);
  } catch (err) {
    console.error('Impossible de persister les fichiers, utilisation du cache mémoire uniquement', err);
  }
}

function getTextFromRequest(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body.text;
  }

  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body);
      return parsed?.text;
    } catch {
      return undefined;
    }
  }

  if (req.query?.text) {
    return req.query.text;
  }

  return undefined;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non supportée. Utilisez POST pour analyser un texte.' });
  }

  const text = getTextFromRequest(req);
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Champ "text" requis dans le corps JSON ou en query string.' });
  }

  const tokens = tokenize(text);
  await ensureStores();
  const state = await loadState();

  let freq = updateFrequencies(tokens, state.freq);
  let matrix = updateMatrix(tokens, state.matrix);
  ({ freq, matrix } = trimToTop(freq, matrix));

  const centrality = calculateCentrality(matrix);
  const pivot = selectPivot(tokens, centrality, freq);
  const orbites = buildOrbits(pivot, matrix);
  const freqPivot = pivot ? freq[pivot] || 0 : 0;
  const variation = computeDelta(pivot, centrality, state.history);
  const { metaphore, constellation } = craftMetaphor(pivot, orbites, variation);
  const history = recordHistory(state.history, centrality, freq);

  await saveState({ matrix, freq, history });

  return res.status(200).json({
    pivot,
    orbites,
    freqPivot,
    centralite: pivot ? centrality[pivot] || 0 : 0,
    variation,
    metaphore,
    constellation
  });
}
