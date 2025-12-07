const METAPHORS = [
  'comme un souffle retenu',
  'comme un ciel en attente',
  'comme une porte entrouverte'
];

function normalize(text = '') {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function tokenize(text = '') {
  const cleaned = normalize(text);
  return cleaned ? cleaned.split(/\s+/).filter(Boolean) : [];
}

function frequencies(tokens) {
  const counts = new Map();
  tokens.forEach((token) => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });
  return counts;
}

function cooccurrenceMatrix(tokens, windowSize = 3) {
  const matrix = {};
  for (let i = 0; i < tokens.length; i += 1) {
    for (let j = i + 1; j <= i + windowSize && j < tokens.length; j += 1) {
      const a = tokens[i];
      const b = tokens[j];
      if (a === b) continue;
      matrix[a] = matrix[a] || {};
      matrix[b] = matrix[b] || {};
      matrix[a][b] = (matrix[a][b] || 0) + 1;
      matrix[b][a] = (matrix[b][a] || 0) + 1;
    }
  }
  return matrix;
}

function selectPivot(counts) {
  let pivot = '';
  let max = -Infinity;
  counts.forEach((value, key) => {
    if (value > max) {
      max = value;
      pivot = key;
    }
  });
  return pivot;
}

function topCooccurrences(pivot, matrix) {
  const links = matrix[pivot] || {};
  return Object.entries(links)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);
}

function buildPeriphery(tokens, pivot, noyau) {
  const excluded = new Set([pivot, ...noyau]);
  return Array.from(new Set(tokens.filter((token) => !excluded.has(token))));
}

function pickMetaphor(seed) {
  const index = Math.abs(seed) % METAPHORS.length;
  return METAPHORS[index];
}

function buildEcho(pivot, noyau) {
  const first = noyau[0] || '...';
  const second = noyau[1] || '...';
  return `Tes mots gravitent autour de « ${pivot} », là où ${pivot} rencontre ${first} et ${second}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Utilisez POST sur /api/echo avec un champ "message".' });
  }

  const message = req.body?.message || '';
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Champ "message" requis dans le corps JSON.' });
  }

  const tokens = tokenize(message);
  const counts = frequencies(tokens);
  const pivot = selectPivot(counts);
  const matrix = cooccurrenceMatrix(tokens);
  const pivotLinks = matrix[pivot] || {};
  const noyau = topCooccurrences(pivot, matrix);
  const peripherie = buildPeriphery(tokens, pivot, noyau);
  const centralite = pivot ? (counts.get(pivot) || 0) + Object.keys(pivotLinks).length : 0;
  const metaphore = pickMetaphor(pivot.length + tokens.length);
  const echo = pivot ? buildEcho(pivot, noyau) : '';

  return res.status(200).json({
    pivot,
    noyau,
    peripherie,
    cooccurrences: pivotLinks,
    centralite,
    metaphore,
    echo,
    tags: ['#pivot', '#noyau', '#emotion']
  });
}
