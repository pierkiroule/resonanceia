import { stopwordsFr } from './utils/stopwords.js';

function stripDiacritics(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function tokenize(text = '') {
  const normalized = stripDiacritics(text.toLowerCase());
  const rawTokens = normalized
    .split(/[^a-z\-'’]+/)
    .map((t) => t.replace(/^[\-'’]+|[\-'’]+$/g, ''))
    .filter(Boolean);

  const filtered = rawTokens.filter((token) => {
    if (token.length <= 1) return false;
    return !stopwordsFr.has(token);
  });

  return filtered;
}

export function countLocal(tokens = []) {
  const counts = new Map();
  tokens.forEach((token) => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });
  return counts;
}
