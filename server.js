import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import echoHandler from './api/echo/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// CORS minimal pour un déploiement sur Render ou équivalent
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

app.post('/api/echo', echoHandler);
app.get('/openapi.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'openapi.json'));
});

// Sert l'index pour toute autre route (déploiement statique simple)
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Serveur ÉCHO démarré sur le port ${PORT}`);
});
