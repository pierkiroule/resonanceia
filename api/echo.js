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

let previousPivot = '';

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

function countTokens(tokens = []) {
  const counts = new Map();
  tokens.forEach((token) => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });
  return counts;
}

function selectPivot(counts = new Map()) {
  let pivot = '';
  let max = 0;
  for (const [word, count] of counts.entries()) {
    if (count > max) {
      max = count;
      pivot = word;
    }
  }
  return pivot;
}

function buildCooccurrences(pivot, counts = new Map()) {
  const cooccurrences = {};
  if (!pivot) return cooccurrences;

  for (const [word, count] of counts.entries()) {
    if (word === pivot) continue;
    cooccurrences[`${pivot}-${word}`] = count;
  }
  return cooccurrences;
}

function splitOrbits(cooccurrences = {}) {
  const noyau = [];
  const peripherie = [];

  Object.entries(cooccurrences).forEach(([key, value]) => {
    if (value > 1) {
      noyau.push(key.split('-')[1]);
    } else if (value === 1) {
      peripherie.push(key.split('-')[1]);
    }
  });

  return { noyau, peripherie };
}

function buildTags(pivot, noyau = [], peripherie = []) {
  const tags = new Set();
  if (pivot) tags.add(pivot);
  noyau.forEach((w) => w && tags.add(w));
  peripherie.forEach((w) => w && tags.add(w));
  return Array.from(tags);
}

function computeDelta(pivot) {
  const delta = previousPivot && pivot === previousPivot ? 'stabilité' : previousPivot ? 'variation' : 'stabilité';
  previousPivot = pivot;
  return delta;
}

function getMessage(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body.message || req.body.text;
  }

  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body);
      return parsed?.message || parsed?.text;
    } catch {
      return undefined;
    }
  }

  if (req.query?.message) return req.query.message;
  if (req.query?.text) return req.query.text;

  return undefined;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non supportée. Utilisez POST.' });
  }

  const message = getMessage(req);
  if (typeof message !== 'string') {
    return res.status(400).json({ error: 'Champ "message" requis (ou alias "text").' });
  }

  if (!message.trim()) {
    return res.status(200).json({ echo: 'silence extérieur', tags: [] });
  }

  const tokens = tokenize(message);
  if (!tokens.length) {
    return res.status(200).json({ echo: 'silence extérieur', tags: [] });
  }

  const counts = countTokens(tokens);
  const pivot = selectPivot(counts);
  const cooccurrences = buildCooccurrences(pivot, counts);
  const centralite = Object.values(cooccurrences).reduce((acc, val) => acc + val, 0);
  const { noyau, peripherie } = splitOrbits(cooccurrences);
  const tags = buildTags(pivot, noyau, peripherie);
  const delta = computeDelta(pivot);

  return res.status(200).json({
    pivot,
    noyau,
    peripherie,
    centralite,
    delta,
    cooccurrences,
    tags
  });
}
