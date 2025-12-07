// Core lexical analysis utilities for the ÉCHO RÉSONANT API.
// The functions are deterministic and rely only on simple string operations.

const STOP_WORDS = new Set([
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
  'et', 'ou', 'de', 'des', 'du', 'la', 'le', 'les', 'un', 'une',
  'mais', 'que', 'qui', 'dans', 'en', 'au', 'aux', 'ce', 'cet', 'cette', 'ces',
  'ne', 'pas', 'plus', 'pour', 'par', 'sur', 'se', 'sa', 'son', 'mes', 'tes', 'ses',
  'leur', 'leurs', 'avec', 'comme', 'y', 'a', 'aujourd', 'hui', 'tout', 'toute',
  'tous', 'toutes', 'fait', 'faire', 'cest', 'est', 'etre', 'être', 'ai', 'as', 'ont',
]);

// Light IDF-like weights to weaken very common emotional verbs/nouns.
const IDF_HINTS = {
  ressentir: 0.4,
  ressent: 0.4,
  sentir: 0.45,
  pression: 0.9,
  peur: 0.7,
  douleur: 0.8,
  joie: 1.2,
  tristesse: 0.9,
  coeur: 0.9,
  avancer: 1.05,
  continuer: 1.0,
};

function normalize(message = '') {
  return message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(message = '') {
  const normalized = normalize(message);
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
}

function lemmatizeToken(token) {
  if (!token) return token;
  // Basic plural handling
  if (token.endsWith('aux') && token.length > 3) return token.slice(0, -3) + 'al';
  if (token.endsWith('eaux')) return token.slice(0, -1); // manteaux -> manteau
  if (token.endsWith('s') && token.length > 3) token = token.slice(0, -1);

  // Feminine/masculine trim
  if (token.endsWith('e') && token.length > 3) token = token.slice(0, -1);

  // Verb infinitive approximation
  const verbEndings = ['ait', 'ais', 'aient', 'erai', 'eras', 'erez', 'er', 'ir', 're'];
  for (const ending of verbEndings) {
    if (token.endsWith(ending) && token.length - ending.length > 2) {
      return token.slice(0, -ending.length);
    }
  }

  return token;
}

function lemmatize(tokens = []) {
  return tokens.map(lemmatizeToken);
}

function filterStopWords(tokens = []) {
  return tokens.filter((token) => token && !STOP_WORDS.has(token));
}

function countFrequencies(tokens = []) {
  return tokens.reduce((acc, token) => {
    acc[token] = (acc[token] || 0) + 1;
    return acc;
  }, {});
}

function computeWeights(frequencies = {}) {
  const entries = Object.entries(frequencies);
  const weights = {};
  entries.forEach(([token, count]) => {
    const idf = IDF_HINTS[token] ?? 1;
    const lengthBoost = Math.min(1.3, 0.8 + token.length / 10);
    weights[token] = Number((count * idf * lengthBoost).toFixed(4));
  });
  return weights;
}

function selectPivot(weights = {}) {
  let pivot = '';
  let bestScore = 0;
  Object.entries(weights).forEach(([token, score]) => {
    if (score > bestScore || (score === bestScore && token < pivot)) {
      pivot = token;
      bestScore = score;
    }
  });
  return pivot || null;
}

function buildCooccurrences(tokens = [], pivot, windowSize = 2) {
  const cooccurrences = {};
  if (!pivot) return cooccurrences;
  tokens.forEach((token, index) => {
    if (token !== pivot) return;
    const start = Math.max(0, index - windowSize);
    const end = Math.min(tokens.length, index + windowSize + 1);
    for (let i = start; i < end; i += 1) {
      if (i === index) continue;
      const neighbor = tokens[i];
      if (!neighbor || neighbor === pivot) continue;
      const key = `${pivot}:${neighbor}`;
      cooccurrences[key] = (cooccurrences[key] || 0) + 1;
    }
  });
  return cooccurrences;
}

function buildNoyau(cooccurrences = {}, limit = 4) {
  return Object.entries(cooccurrences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key.split(':')[1]);
}

function buildPeripherie(tokens = [], pivot, noyau = []) {
  const excluded = new Set([pivot, ...noyau]);
  const filtered = tokens.filter((token) => token && !excluded.has(token));
  return Array.from(new Set(filtered));
}

function prepareLexicalData(message) {
  const tokens = tokenize(message);
  const lemmas = lemmatize(tokens);
  const cleaned = filterStopWords(lemmas);
  const frequencies = countFrequencies(cleaned);
  const weights = computeWeights(frequencies);
  const pivot = selectPivot(weights);
  const cooccurrences = buildCooccurrences(cleaned, pivot);
  const noyau = buildNoyau(cooccurrences);
  const peripherie = buildPeripherie(cleaned, pivot, noyau);

  return {
    tokens,
    lemmas,
    cleaned,
    frequencies,
    weights,
    pivot,
    cooccurrences,
    noyau,
    peripherie,
  };
}

export {
  STOP_WORDS,
  tokenize,
  lemmatize,
  lemmatizeToken,
  filterStopWords,
  countFrequencies,
  computeWeights,
  selectPivot,
  buildCooccurrences,
  buildNoyau,
  buildPeripherie,
  prepareLexicalData,
};
