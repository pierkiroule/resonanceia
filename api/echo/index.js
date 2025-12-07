import { performance } from 'node:perf_hooks';
import { prepareLexicalData } from '../../lib/analysis.js';
import { buildMetaphore } from '../../lib/metaphore.js';
import { pickQuestion } from '../../lib/questions.js';
import { buildTags, buildCielEtoile } from '../../lib/tags.js';

let usageCount = 0;
const cache = new Map();

function detectContentType(req) {
  const accept = req.headers['accept'] || '';
  if (accept.includes('text/plain')) return 'text/plain; charset=utf-8';
  return 'application/json; charset=utf-8';
}

function buildSuggestions(pivot, noyau = [], peripherie = []) {
  const seed = [pivot, ...noyau, ...peripherie].filter(Boolean);
  const first = seed[0] || 'mot';
  const second = seed[1] || 'souffle';
  const third = seed[2] || 'trajet';
  return [
    `pose une main sur ${first}`,
    `laisse ${second} desserrer le cadre`,
    `ecoute le pas de ${third}`,
  ];
}

function buildCooccurrencePairs(cooccurrences = {}) {
  const pairs = {};
  Object.entries(cooccurrences).forEach(([key, count]) => {
    pairs[key] = count;
  });
  return pairs;
}

function buildResponse(message, debug = false) {
  const lexical = prepareLexicalData(message);
  const { pivot, noyau, peripherie, cooccurrences, frequencies } = lexical;

  const tags = buildTags({ pivot, noyau, peripherie });
  const cielEtoile = buildCielEtoile(tags);
  const metaphore = buildMetaphore(pivot, noyau);
  const question_rebond = pickQuestion(pivot);
  const suggestions_poetiques = buildSuggestions(pivot, noyau, peripherie);
  const comptage = {
    total: lexical.cleaned.length,
    pivot: pivot ? frequencies[pivot] || 0 : 0,
    repartition: frequencies,
  };

  const payload = {
    pivot,
    noyau,
    peripherie,
    cooccurrences: buildCooccurrencePairs(cooccurrences),
    tags,
    metaphore,
    question_rebond,
    suggestions_poetiques,
    ciel_etoile: cielEtoile,
    comptage,
  };

  if (debug) {
    payload.debug = lexical;
  }

  return payload;
}

export default function handler(req, res) {
  const started = performance.now();
  if (req.method !== 'POST') {
    res.status(405).set('Allow', 'POST').send({ error: 'Method not allowed' });
    return;
  }

  const message = typeof req.body?.message === 'string' ? req.body.message : '';
  const debug = Boolean(req.body?.debug);

  res.set('Content-Type', detectContentType(req));

  if (!message.trim()) {
    res.status(400).send({ error: 'message requis' });
    return;
  }

  usageCount += 1;
  const cacheKey = `${message}|${debug}`;
  if (cache.has(cacheKey)) {
    const cached = { ...cache.get(cacheKey) };
    cached.cache_hit = true;
    cached.usage_stats = { total_calls: usageCount };
    cached.temps_execution_ms = Number((performance.now() - started).toFixed(2));
    res.send(cached);
    return;
  }

  const response = buildResponse(message, debug);
  response.cache_hit = false;
  response.usage_stats = { total_calls: usageCount };
  response.temps_execution_ms = Number((performance.now() - started).toFixed(2));

  cache.set(cacheKey, { ...response });
  res.send(response);
}
