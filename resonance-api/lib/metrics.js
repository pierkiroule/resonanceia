import { countLocal } from './tokenizer.js';

export function calculateCentrality(matrix = {}) {
  const centrality = {};
  Object.entries(matrix).forEach(([word, connections]) => {
    centrality[word] = Object.values(connections || {}).reduce((acc, val) => acc + val, 0);
  });
  return centrality;
}

export function buildOrbits(pivot, matrix = {}) {
  if (!pivot) return [];
  const row = matrix[pivot] || {};
  return Object.entries(row)
    .map(([mot, force]) => ({ mot, force }))
    .sort((a, b) => b.force - a.force);
}

export function selectPivot(tokens = [], centrality = {}, freq = {}) {
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

export function computeDelta(pivot, centrality = {}, history = []) {
  if (!pivot) return 0;
  const previousCentrality = history.at(-1)?.centrality || {};
  const prevValue = previousCentrality[pivot] || 0;
  const current = centrality[pivot] || 0;
  return current - prevValue;
}

export function recordHistory(history = [], centrality = {}, freq = {}) {
  const snapshot = {
    timestamp: new Date().toISOString(),
    centrality,
    freq
  };
  const next = [...history, snapshot];
  const MAX = 50;
  return next.slice(-MAX);
}
