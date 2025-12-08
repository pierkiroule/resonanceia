import express from 'express';
import { getGraphData } from '../db.js';

const router = express.Router();

router.get('/graph', (_req, res) => {
  const graph = getGraphData();
  res.json(graph);
});

export default router;
