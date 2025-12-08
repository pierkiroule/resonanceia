import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import emojiRouter from './routes/emojireso.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  return next();
});
app.use(express.json());

app.use('/api', emojiRouter);

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(publicPath, 'dashboard.html'));
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(publicPath, 'dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`EmojiRéso•° sur le port ${PORT}`);
});
