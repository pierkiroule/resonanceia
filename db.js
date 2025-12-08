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

const dbPath = path.join(dataDir, 'reseau.db');
export const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session TEXT,
  timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS emoji_count (
  emoji TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS emoji_links (
  emoji1 TEXT NOT NULL,
  emoji2 TEXT NOT NULL,
  cooccurrence_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (emoji1, emoji2)
);
`);

const insertInteractionStmt = db.prepare(
  'INSERT INTO interactions (session, timestamp) VALUES (?, ?)',
);

const upsertCountStmt = db.prepare(
  `INSERT INTO emoji_count (emoji, count)
   VALUES (:emoji, :count)
   ON CONFLICT(emoji) DO UPDATE SET count = emoji_count.count + excluded.count`,
);

const upsertLinkStmt = db.prepare(
  `INSERT INTO emoji_links (emoji1, emoji2, cooccurrence_count)
   VALUES (:emoji1, :emoji2, :cooccurrence_count)
   ON CONFLICT(emoji1, emoji2) DO UPDATE SET cooccurrence_count = emoji_links.cooccurrence_count + excluded.cooccurrence_count`,
);

function normalizeEmojis(emojis = []) {
  return emojis
    .filter((e) => typeof e === 'string' && e.trim().length > 0)
    .map((e) => e.trim());
}

function combinations(emojis) {
  const counts = new Map();
  for (let i = 0; i < emojis.length; i += 1) {
    for (let j = i + 1; j < emojis.length; j += 1) {
      const [a, b] = [emojis[i], emojis[j]].sort();
      const key = `${a}|${b}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return counts;
}

export function resetDatabase() {
  const tx = db.transaction(() => {
    db.exec('DELETE FROM emoji_links; DELETE FROM emoji_count; DELETE FROM interactions;');
  });
  tx();
}

export function recordInteraction(emojis, session = null) {
  const cleaned = normalizeEmojis(emojis);
  if (!cleaned.length) return { central: [], orbit: [], isolated: [], emerging: [], graph: { nodes: [], links: [] } };

  const now = Date.now();
  const freq = cleaned.reduce((acc, emoji) => {
    acc.set(emoji, (acc.get(emoji) || 0) + 1);
    return acc;
  }, new Map());

  const existing = new Map();
  const placeholders = cleaned.map(() => '?').join(',');
  if (placeholders.length) {
    const rows = db
      .prepare(`SELECT emoji, count FROM emoji_count WHERE emoji IN (${placeholders})`)
      .all(...cleaned);
    rows.forEach((row) => existing.set(row.emoji, row.count));
  }

  const pairCounts = combinations(cleaned);

  const tx = db.transaction(() => {
    insertInteractionStmt.run(session, now);
    freq.forEach((count, emoji) => {
      upsertCountStmt.run({ emoji, count });
    });
    pairCounts.forEach((count, key) => {
      const [emoji1, emoji2] = key.split('|');
      upsertLinkStmt.run({ emoji1, emoji2, cooccurrence_count: count });
    });
  });
  tx();

  const graph = getGraph();
  const emerging = cleaned.filter((emoji) => !existing.has(emoji));
  const classified = classifyGraph(graph, emerging);

  return { ...classified, graph };
}

export function getGraph() {
  const counts = db.prepare('SELECT emoji, count FROM emoji_count').all();
  const links = db.prepare('SELECT emoji1, emoji2, cooccurrence_count FROM emoji_links').all();

  const maxCount = Math.max(...counts.map((c) => c.count), 1);
  const densityMap = new Map();
  const nodesMap = new Map();

  counts.forEach(({ emoji, count }) => {
    nodesMap.set(emoji, { id: emoji, count, centrality: 0, density: 0 });
  });

  links.forEach(({ emoji1, emoji2, cooccurrence_count }) => {
    if (!nodesMap.has(emoji1)) nodesMap.set(emoji1, { id: emoji1, count: 0, centrality: 0, density: 0 });
    if (!nodesMap.has(emoji2)) nodesMap.set(emoji2, { id: emoji2, count: 0, centrality: 0, density: 0 });

    densityMap.set(emoji1, (densityMap.get(emoji1) || 0) + cooccurrence_count);
    densityMap.set(emoji2, (densityMap.get(emoji2) || 0) + cooccurrence_count);
  });

  nodesMap.forEach((node, emoji) => {
    const centrality = (node.count || 0) / maxCount;
    node.centrality = Number(centrality.toFixed(3));
    node.density = Number((densityMap.get(emoji) || 0).toFixed(3));
  });

  const nodes = [...nodesMap.values()].sort((a, b) => b.count - a.count || b.density - a.density);
  const formattedLinks = links.map(({ emoji1, emoji2, cooccurrence_count }) => ({
    source: emoji1,
    target: emoji2,
    weight: cooccurrence_count,
  }));

  return { nodes, links: formattedLinks };
}

function classifyGraph(graph, emerging = []) {
  const nodes = graph.nodes || [];
  if (!nodes.length) return { central: [], orbit: [], isolated: [], emerging };

  const sorted = [...nodes].sort((a, b) => b.centrality - a.centrality || b.count - a.count);
  const topCentrality = sorted[0]?.centrality || 0;
  const central = sorted
    .filter((node) => node.centrality === topCentrality)
    .slice(0, 2)
    .map((n) => n.id);

  const orbit = nodes
    .filter((node) => !central.includes(node.id) && node.density > 0)
    .map((n) => n.id);

  const isolated = nodes
    .filter((node) => !central.includes(node.id) && !orbit.includes(node.id))
    .map((n) => n.id);

  return { central, orbit, isolated, emerging: [...new Set(emerging)] };
}

export function getCurrentState() {
  const graph = getGraph();
  const classified = classifyGraph(graph, []);
  return { ...classified, graph };
}
