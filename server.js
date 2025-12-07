import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const STOP_WORDS = new Set([
  "je",
  "tu",
  "il",
  "elle",
  "nous",
  "vous",
  "ils",
  "elles",
  "et",
  "ou",
  "de",
  "des",
  "du",
  "la",
  "le",
  "les",
  "un",
  "une",
  "mais",
  "que",
  "qui",
  "dans",
  "en",
  "au",
  "aux",
  "ce",
  "ça",
  "cette",
  "ces",
  "ne",
  "pas",
  "plus",
  "pour",
  "par",
  "sur",
  "se",
  "sa",
  "son",
  "mes",
  "tes",
  "ses"
]);

const METAPHORS = [
  "comme un ciel chargé mais vivant",
  "comme une marée intérieure en mouvement",
  "comme une constellation qui cherche son centre"
];

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

app.post('/api/echo', (req, res) => {
  const { message } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.json(buildEmptyEcho());
  }

  const cleanedWords = sanitizeMessage(message);
  const meaningfulWords = cleanedWords.filter((word) => word && !STOP_WORDS.has(word));

  if (meaningfulWords.length === 0) {
    return res.json(buildEmptyEcho());
  }

  const frequencies = countFrequencies(meaningfulWords);
  const pivot = selectPivot(frequencies);
  const cooccurrences = buildCooccurrences(meaningfulWords, pivot);
  const sortedCooccurrenceEntries = Object.entries(cooccurrences).sort((a, b) => b[1] - a[1]);
  const noyau = sortedCooccurrenceEntries.slice(0, 3).map(([word]) => word);
  const noyauSet = new Set(noyau);
  const peripherie = meaningfulWords.filter((word) => word !== pivot && !noyauSet.has(word));
  const uniquePeripherie = Array.from(new Set(peripherie));
  const centralite = Object.values(cooccurrences).reduce((sum, value) => sum + value, 0);
  const metaphor = pickMetaphor();
  const echo = buildEchoText(pivot, noyau);
  const tags = buildTags({ pivot, noyau, peripherie: uniquePeripherie });

  res.json({
    pivot,
    noyau,
    peripherie: uniquePeripherie,
    centralite,
    cooccurrences,
    tags,
    metaphore: metaphor,
    echo
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Serveur ÉCHO démarré sur le port ${PORT}`);
});

function sanitizeMessage(message = '') {
  return message
    .toLowerCase()
    .replace(/[,.?!:;]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function countFrequencies(words) {
  return words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {});
}

function selectPivot(frequencies) {
  return Object.entries(frequencies).reduce((best, current) => {
    const [word, count] = current;
    if (!best) return word;
    const bestCount = frequencies[best];
    if (count > bestCount) return word;
    if (count === bestCount && word < best) return word;
    return best;
  }, '');
}

function buildCooccurrences(words, pivot) {
  return words.reduce((acc, word) => {
    if (word === pivot) return acc;
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {});
}

function pickMetaphor() {
  const index = Math.floor(Math.random() * METAPHORS.length);
  return METAPHORS[index];
}

function buildEchoText(pivot, noyau) {
  const noyauText = noyau.length > 0 ? noyau.join(', ') : 'des nuances encore floues';
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

