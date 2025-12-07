import express from 'express';
import { tokenize } from './lib/tokenizer.js';
import {
  ensureStores,
  loadState,
  saveState,
  trimToTop,
  updateFrequencies,
  updateMatrix
} from './lib/cooccurrence.js';
import {
  buildOrbits,
  calculateCentrality,
  computeDelta,
  recordHistory,
  selectPivot
} from './lib/metrics.js';
import { craftMetaphor } from './lib/metaphor.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.post('/api/ciel', async (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Texte requis pour tracer le ciel.' });
  }

  const tokens = tokenize(text);
  await ensureStores();
  const state = await loadState();

  let freq = updateFrequencies(tokens, state.freq);
  let matrix = updateMatrix(tokens, state.matrix);
  ({ freq, matrix } = trimToTop(freq, matrix));

  const centrality = calculateCentrality(matrix);
  const pivot = selectPivot(tokens, centrality, freq);
  const orbites = buildOrbits(pivot, matrix);
  const freqPivot = pivot ? freq[pivot] || 0 : 0;
  const variation = computeDelta(pivot, centrality, state.history);
  const { metaphore, constellation } = craftMetaphor(pivot, orbites, variation);
  const history = recordHistory(state.history, centrality, freq);

  await saveState({ matrix, freq, history });

  return res.json({
    pivot,
    orbites,
    freqPivot,
    centralite: pivot ? centrality[pivot] || 0 : 0,
    variation,
    metaphore,
    constellation
  });
});

app.post('/api/ciel/image', async (req, res) => {
  return res.json({
    message: 'Générateur d’image en attente, le ciel reste textuel pour l’instant.',
    status: 'stub'
  });
});

app.post('/api/reset', async (_req, res) => {
  await ensureStores();
  const emptyState = { matrix: {}, freq: {}, history: [] };
  await saveState(emptyState);
  return res.json({ message: 'Mémoire réinitialisée. Le ciel est clair.' });
});

app.get('/api/state', async (_req, res) => {
  await ensureStores();
  const { matrix, freq, history } = await loadState();
  return res.json({ matrix, freq, history });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Le Ciel Étoilé — API Résonante prête sur le port ${PORT}`);
});
