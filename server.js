import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const STOP_WORDS = new Set([
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
  'et', 'ou', 'de', 'des', 'du', 'la', 'le', 'les', 'un', 'une',
  'mais', 'que', 'qui', 'dans', 'en', 'au', 'aux', 'ce', 'cet',
  'cette', 'ces', 'ne', 'pas', 'plus', 'pour', 'par', 'sur', 'se',
  'sa', 'son', 'mes', 'tes', 'ses', 'leur', 'leurs', 'avec', 'comme'
]);

const METAPHORS = [
  'comme une onde qui se propage dans la pièce',
  'comme un phare qui capte un signal lointain',
  'comme une vibration sur un fil tendu',
  'comme une constellation qui cherche son centre'
];

app.use(express.json());

// CORS minimal pour un déploiement sur Render ou équivalent
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

app.post('/api/echo', (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message : '';

  if (!message.trim()) {
    return res.json(buildEmptyEcho());
  }

  const tokens = tokenize(message);
  const filtered = tokens.filter((word) => word && !STOP_WORDS.has(word));

  if (filtered.length === 0) {
    return res.json(buildEmptyEcho());
  }

  const frequencies = countFrequencies(filtered);
  const pivot = selectPivot(frequencies);
  const cooccurrences = buildCooccurrences(filtered, pivot);
  const noyau = pickNoyau(cooccurrences);
  const peripherie = buildPeripherie(filtered, pivot, noyau);
  const centralite = computeCentrality({ pivot, frequencies, cooccurrences, totalWords: filtered.length });
  const metaphore = pickMetaphor(pivot.length + filtered.length);
  const echo = buildEchoText(pivot, noyau);
  const tags = buildTags({ pivot, noyau, peripherie });

  return res.json({
    pivot,
    noyau,
    peripherie,
    centralite,
    cooccurrences,
    tags,
    metaphore,
    echo
  });
});

// Sert l'index pour toute autre route (déploiement statique simple)
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Serveur ÉCHO démarré sur le port ${PORT}`);
});

function tokenize(message = '') {
  return message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function countFrequencies(words) {
  return words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {});
}

function selectPivot(frequencies) {
  return Object.entries(frequencies).reduce((best, [word, count]) => {
    if (!best) return word;
    const bestCount = frequencies[best];
    if (count > bestCount) return word;
    if (count === bestCount && word < best) return word;
    return best;
  }, '');
}

function buildCooccurrences(words, pivot, windowSize = 2) {
  const cooccurrences = {};
  words.forEach((word, index) => {
    if (word !== pivot) return;
    const start = Math.max(0, index - windowSize);
    const end = Math.min(words.length, index + windowSize + 1);
    for (let i = start; i < end; i += 1) {
      if (i === index) continue;
      const neighbor = words[i];
      if (neighbor === pivot) continue;
      cooccurrences[neighbor] = (cooccurrences[neighbor] || 0) + 1;
    }
  });
  return cooccurrences;
}

function pickNoyau(cooccurrences) {
  return Object.entries(cooccurrences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);
}

function buildPeripherie(words, pivot, noyau) {
  const exclude = new Set([pivot, ...noyau]);
  const peripherie = words.filter((word) => !exclude.has(word));
  return Array.from(new Set(peripherie));
}

function computeCentrality({ pivot, frequencies, cooccurrences, totalWords }) {
  if (!pivot) return 0;
  const pivotCount = frequencies[pivot] || 0;
  const cooccSum = Object.values(cooccurrences).reduce((sum, value) => sum + value, 0);
  const score = (pivotCount + cooccSum) / Math.max(1, totalWords);
  return Number(score.toFixed(2));
}

function pickMetaphor(seed) {
  const index = Math.abs(seed) % METAPHORS.length;
  return METAPHORS[index];
}

function buildEchoText(pivot, noyau) {
  if (!pivot) return 'Aucun écho extérieur détecté.';
  const noyauText = noyau.length ? noyau.join(', ') : 'des nuances encore floues';
  return `Tes mots gravitent autour de « ${pivot} », en lien avec ${noyauText}.`;
}

function buildTags({ pivot, noyau, peripherie }) {
  const tags = [];
  if (pivot) tags.push(pivot);
  noyau.forEach((word) => {
    if (word && !tags.includes(word)) tags.push(word);
  });
  peripherie.slice(0, 2).forEach((word) => {
    if (word && !tags.includes(word)) tags.push(word);
  });
  return tags;
}

function buildEmptyEcho() {
  return {
    pivot: null,
    noyau: [],
    peripherie: [],
    centralite: 0,
    cooccurrences: {},
    tags: [],
    metaphore: 'silence extérieur',
    echo: 'Aucun écho extérieur détecté.'
  };
}
