import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import pushRouter from './routes/push.js';
import graphRouter from './routes/graph.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', pushRouter);
app.use('/api', graphRouter);

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicPath, 'dashboard.html'));
});

app.get('/openapi.json', (_req, res) => {
  res.sendFile(path.join(__dirname, 'openapi.json'));
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(publicPath, 'dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`API ÉCHO résonante sur le port ${PORT}`);
});
