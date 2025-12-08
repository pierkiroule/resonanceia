import express from 'express';
import { getCurrentState, recordInteraction, resetDatabase } from '../db.js';

const router = express.Router();

router.post('/emojireso', (req, res) => {
  const { emojis, session } = req.body || {};
  if (!Array.isArray(emojis) || emojis.length === 0) {
    return res.status(400).json({ error: 'payload emojis requis (array non vide)' });
  }

  try {
    const result = recordInteraction(emojis, session || null);
    return res.json(result);
  } catch (error) {
    console.error('Erreur /emojireso', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/emojireso', (_req, res) => {
  const state = getCurrentState();
  res.json(state);
});

router.post('/emojireso/reset', (_req, res) => {
  resetDatabase();
  res.json({ ok: true });
});

export default router;
