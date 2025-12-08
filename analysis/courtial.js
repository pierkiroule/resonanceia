const STOPWORDS = new Set([
  'alors', 'au', 'aucun', 'aussi', 'autre', 'avant', 'avec', 'avoir', 'bon', 'car', 'ce', 'cela',
  'ces', 'ceux', 'chaque', 'ci', 'comme', 'comment', 'dans', 'de', 'des', 'du', 'dedans', 'dehors',
  'depuis', 'deux', 'devrait', 'donc', 'dos', 'droite', 'début', 'elle', 'elles', 'en', 'encore',
  'essai', 'est', 'et', 'eu', 'fait', 'faites', 'fois', 'font', 'force', 'haut', 'hors', 'ici',
  'il', 'ils', 'je', 'juste', 'la', 'le', 'les', 'leur', 'là', 'ma', 'maintenant', 'mais', 'mes',
  'mine', 'moins', 'mon', 'mot', 'même', 'ne', 'ni', 'nommés', 'nos', 'notre', 'nous', 'nouveaux',
  'on', 'ou', 'où', 'par', 'parce', 'parole', 'pas', 'personnes', 'peut', 'peu', 'pièce', 'plupart',
  'pour', 'pourquoi', 'quand', 'que', 'quel', 'quelle', 'quelles', 'quels', 'qui', 'sa', 'sans',
  'ses', 'seulement', 'si', 'sien', 'son', 'sont', 'sous', 'soyez', 'sujet', 'sur', 'ta', 'tandis',
  'tellement', 'tels', 'tes', 'ton', 'tous', 'tout', 'trop', 'très', 'tu', 'voient', 'vont', 'votre',
  'vous', 'vu', 'ça', 'étaient', 'état', 'étions', 'été', 'être'
]);

const polarityMap = {
  peur: { emoji: '😨', keywords: ['peur', 'angoisse', 'crainte', 'tremble', 'panique'] },
  colere: { emoji: '🔥', keywords: ['colere', 'rage', 'fureur', 'colère', 'violent'] },
  controle: { emoji: '🧠', keywords: ['controle', 'maitrise', 'contrôle', 'domine', 'tenir'] },
  soulagement: { emoji: '🌿', keywords: ['apaisement', 'calme', 'soulagement', 'respiration', 'paix'] },
  perte: { emoji: '🌪', keywords: ['perte', 'vide', 'absence', 'deuil', 'manque'] },
  transformation: { emoji: '🦋', keywords: ['transformation', 'mutation', 'metamorphose', 'renaissance'] },
};

function normalize(text = '') {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\s'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  const cleaned = normalize(text);
  if (!cleaned) return [];
  return cleaned
    .split(' ')
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((token) => !STOPWORDS.has(token));
}

function cooccurrence(tokens, windowSize = 3) {
  const pairs = new Map();
  const neighborWeights = new Map();

  for (let i = 0; i < tokens.length; i += 1) {
    const current = tokens[i];
    for (let j = i + 1; j <= i + windowSize && j < tokens.length; j += 1) {
      const other = tokens[j];
      if (!other || current === other) continue;
      const [a, b] = [current, other].sort();
      const key = `${a}|${b}`;
      pairs.set(key, (pairs.get(key) || 0) + 1);

      if (!neighborWeights.has(current)) neighborWeights.set(current, new Map());
      if (!neighborWeights.has(other)) neighborWeights.set(other, new Map());
      neighborWeights.get(current).set(other, (neighborWeights.get(current).get(other) || 0) + 1);
      neighborWeights.get(other).set(current, (neighborWeights.get(other).get(current) || 0) + 1);
    }
  }

  return { pairs, neighborWeights };
}

function deriveClusters(counts) {
  const clusters = [];
  const countsObj = Object.fromEntries(counts);
  const maxCount = Math.max(...Object.values(countsObj), 1);

  Object.entries(polarityMap).forEach(([tag, { emoji, keywords }]) => {
    const score = keywords.reduce((acc, word) => acc + (countsObj[word] || 0), 0);
    if (score > 0) {
      clusters.push({ tag, emoji, intensite: Number((score / maxCount).toFixed(2)) });
    }
  });

  if (!clusters.length) {
    clusters.push({ tag: 'emergence', emoji: '⭐', intensite: 0.2 });
  }

  return clusters.sort((a, b) => b.intensite - a.intensite);
}

function pickPivot(centrality, counts) {
  let pivot = '';
  let bestScore = -Infinity;

  centrality.forEach((score, word) => {
    const count = counts.get(word) || 0;
    const composite = score * 2 + count;
    if (composite > bestScore) {
      bestScore = composite;
      pivot = word;
    }
  });

  if (!pivot && counts.size) {
    pivot = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  return pivot;
}

function densities(neighborWeights, counts) {
  const densitiesByWord = new Map();
  counts.forEach((count, word) => {
    const neighbors = neighborWeights.get(word);
    const totalWeight = neighbors ? [...neighbors.values()].reduce((a, b) => a + b, 0) : 0;
    densitiesByWord.set(word, totalWeight / Math.max(1, count));
  });
  return densitiesByWord;
}

export function analyzeText(text) {
  const tokens = tokenize(text);
  const counts = tokens.reduce((acc, token) => acc.set(token, (acc.get(token) || 0) + 1), new Map());
  const { pairs, neighborWeights } = cooccurrence(tokens, 3);

  const centrality = new Map();
  neighborWeights.forEach((neighbors, word) => {
    centrality.set(word, neighbors.size);
  });

  const pivot = pickPivot(centrality, counts);
  const densitiesByWord = densities(neighborWeights, counts);
  const avgDensity = [...densitiesByWord.values()].reduce((a, b) => a + b, 0) / Math.max(1, densitiesByWord.size);

  const noyau = [...densitiesByWord.entries()]
    .filter(([, density]) => density > avgDensity)
    .map(([word]) => word)
    .sort();

  const peripherie = [...counts.keys()]
    .filter((word) => !noyau.includes(word) && word !== pivot)
    .sort();

  const satellites = neighborWeights.get(pivot)
    ? [...neighborWeights.get(pivot).entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([word]) => word)
    : [];

  const densityValue = pairs.size > 0 ? [...pairs.values()].reduce((a, b) => a + b, 0) / Math.max(1, tokens.length) : 0;
  const emergence = counts.size / Math.max(1, tokens.length);

  const clusters = deriveClusters(counts);

  return {
    tokens,
    counts,
    cooccurrences: pairs,
    centrality,
    density: Number(densityValue.toFixed(3)),
    emergence: Number(emergence.toFixed(3)),
    pivot,
    noyau,
    peripherie,
    satellites,
    clusters,
  };
}
