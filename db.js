import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'resonance.db');
export const db = new Database(dbPath);

const initSql = `
CREATE TABLE IF NOT EXISTS terms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL,
  pair TEXT DEFAULT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  last_seen INTEGER NOT NULL,
  weight REAL NOT NULL DEFAULT 0,
  UNIQUE(word, pair)
);
`;
db.exec(initSql);

const upsertStmt = db.prepare(
  `INSERT INTO terms (word, pair, count, last_seen, weight)
   VALUES (@word, @pair, @count, @last_seen, @weight)
   ON CONFLICT(word, pair) DO UPDATE SET
     count = count + excluded.count,
     last_seen = excluded.last_seen,
     weight = weight + excluded.weight`
);

export function persistCounts(counts) {
  const now = Date.now();
  const tx = db.transaction((entries) => {
    entries.forEach(([word, count]) => {
      upsertStmt.run({
        word,
        pair: null,
        count,
        last_seen: now,
        weight: count,
      });
    });
  });
  tx([...counts.entries()]);
}

export function persistPairs(pairWeights) {
  const now = Date.now();
  const tx = db.transaction((entries) => {
    entries.forEach(([key, weight]) => {
      const [a, b] = key.split('|');
      upsertStmt.run({
        word: a,
        pair: b,
        count: weight,
        last_seen: now,
        weight,
      });
    });
  });
  tx([...pairWeights.entries()]);
}

export function getGraphData() {
  const words = db.prepare('SELECT word, count, weight FROM terms WHERE pair IS NULL').all();
  const pairs = db.prepare('SELECT word, pair, count FROM terms WHERE pair IS NOT NULL').all();

  const centrality = new Map();
  const neighborSets = new Map();

  pairs.forEach(({ word, pair }) => {
    if (!neighborSets.has(word)) neighborSets.set(word, new Set());
    if (!neighborSets.has(pair)) neighborSets.set(pair, new Set());
    neighborSets.get(word).add(pair);
    neighborSets.get(pair).add(word);
  });

  neighborSets.forEach((set, term) => {
    centrality.set(term, set.size);
  });

  const nodeMap = new Map();
  words.forEach(({ word, count }) => {
    nodeMap.set(word, {
      id: word,
      count,
      centrality: centrality.get(word) || 0,
    });
  });

  pairs.forEach(({ word, pair, count }) => {
    if (!nodeMap.has(word)) {
      nodeMap.set(word, { id: word, count: 0, centrality: centrality.get(word) || 0 });
    }
    if (!nodeMap.has(pair)) {
      nodeMap.set(pair, { id: pair, count: 0, centrality: centrality.get(pair) || 0 });
    }
  });

  const nodes = [...nodeMap.values()].sort((a, b) => b.count - a.count || b.centrality - a.centrality);
  const links = pairs.map(({ word, pair, count }) => ({ source: word, target: pair, weight: count }));

  return { nodes, links };
}
