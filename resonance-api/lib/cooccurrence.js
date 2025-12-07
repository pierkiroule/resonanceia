import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.resolve(__dirname, '../db');
const MATRIX_PATH = path.join(DB_DIR, 'matrix.json');
const FREQ_PATH = path.join(DB_DIR, 'freq.json');
const HISTORY_PATH = path.join(DB_DIR, 'history.json');

async function ensureDir() {
  await mkdir(DB_DIR, { recursive: true });
}

async function ensureFile(filePath, fallback) {
  try {
    await readFile(filePath, 'utf8');
  } catch {
    await writeFile(filePath, JSON.stringify(fallback, null, 2));
  }
}

async function readJson(filePath) {
  const data = await readFile(filePath, 'utf8');
  return JSON.parse(data || 'null');
}

async function writeJson(filePath, data) {
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export async function ensureStores() {
  await ensureDir();
  await ensureFile(MATRIX_PATH, {});
  await ensureFile(FREQ_PATH, {});
  await ensureFile(HISTORY_PATH, []);
}

export async function loadState() {
  await ensureStores();
  const [matrix, freq, history] = await Promise.all([
    readJson(MATRIX_PATH),
    readJson(FREQ_PATH),
    readJson(HISTORY_PATH)
  ]);

  return {
    matrix: matrix || {},
    freq: freq || {},
    history: Array.isArray(history) ? history : []
  };
}

export async function saveState({ matrix, freq, history }) {
  await ensureDir();
  await Promise.all([
    writeJson(MATRIX_PATH, matrix || {}),
    writeJson(FREQ_PATH, freq || {}),
    writeJson(HISTORY_PATH, history || [])
  ]);
}

export function updateFrequencies(tokens = [], freq = {}) {
  const updated = { ...freq };
  tokens.forEach((token) => {
    updated[token] = (updated[token] || 0) + 1;
  });
  return updated;
}

export function updateMatrix(tokens = [], matrix = {}) {
  const updated = { ...matrix };
  for (let i = 0; i < tokens.length; i += 1) {
    const a = tokens[i];
    for (let j = i + 1; j < tokens.length; j += 1) {
      const b = tokens[j];
      if (a === b) continue;
      const first = updated[a] ? { ...updated[a] } : {};
      const second = updated[b] ? { ...updated[b] } : {};
      first[b] = (first[b] || 0) + 1;
      second[a] = (second[a] || 0) + 1;
      updated[a] = first;
      updated[b] = second;
    }
  }
  return updated;
}

export function trimToTop(freq = {}, matrix = {}, limit = 200) {
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, limit);
  const kept = new Set(top.map(([word]) => word));
  const trimmedFreq = Object.fromEntries(top);
  const trimmedMatrix = {};

  kept.forEach((word) => {
    const row = matrix[word] || {};
    const filteredRow = {};
    Object.entries(row).forEach(([other, value]) => {
      if (kept.has(other)) {
        filteredRow[other] = value;
      }
    });
    trimmedMatrix[word] = filteredRow;
  });

  return { freq: trimmedFreq, matrix: trimmedMatrix };
}
