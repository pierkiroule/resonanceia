import express from 'express';
import { analyzeText } from '../analysis/courtial.js';
import { persistCounts, persistPairs } from '../db.js';

const router = express.Router();

router.post('/push', (req, res) => {
  const { message } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message requis' });
  }

  const analysis = analyzeText(message);

  persistCounts(analysis.counts);
  persistPairs(analysis.cooccurrences);

  return res.json({
    pivot: analysis.pivot,
    noyau: analysis.noyau,
    peripherie: analysis.peripherie,
    satellites: analysis.satellites,
    clusters: analysis.clusters,
    coeffs: {
      densite: analysis.density,
      emergence: analysis.emergence,
      centralite: analysis.centrality.get(analysis.pivot) || 0,
    },
  });
});

export default router;
