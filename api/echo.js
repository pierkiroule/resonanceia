/**
 * api/echo.js
 * 
 * Serveur HTTP minimal pour l'API RésonancIA
 * Route POST /api/echo accepte {message: string}
 * Retourne {pivot, noyau, peripherie, echo}
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const VALID_MODES = ['neutral', 'hypno', 'ado', 'etp'];
const DEFAULT_SYSTEM_PROMPT = 'Tu es un psychologue clinicien bienveillant. Tu écoutes sans juger, reformules ce que l’utilisateur exprime, et tu termines par une question ouverte. Tu ne donnes ni conseils directs, ni diagnostic.';
const FRONTEND_PATH = path.join(__dirname, '..', 'public', 'index.html');

// Charger les patterns
let PATTERNS = {};
try {
  const patternsPath = path.join(__dirname, '..', 'patterns.json');
  PATTERNS = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
} catch (error) {
  console.warn('⚠️  patterns.json non trouvé, utilisation des patterns par défaut');
  PATTERNS = {
    neutral: {
      metaphors: ["comme une onde qui se propage"],
      openQuestions: ["Que signifie cela pour vous?"],
      sentenceStructures: ["Le cœur: {pivot}. Résonnances: {cowords}."]
    }
  };
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function serveFrontend(res) {
  try {
    const html = fs.readFileSync(FRONTEND_PATH, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Frontend introuvable' }));
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function serveStatic(res, pathname) {
  const safeRoot = path.join(__dirname, '..');
  const sanitizedPath = pathname.replace(/^\/+/, '') || 'index.html';
  const absolutePath = path.normalize(path.join(safeRoot, sanitizedPath));

  if (!absolutePath.startsWith(safeRoot)) {
    return false;
  }

  if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
    return false;
  }

  const ext = path.extname(absolutePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  res.end(fs.readFileSync(absolutePath));
  return true;
}

function filterPivotLinks(pairs, pivot, limit) {
  if (!pivot) return [];

  return Object.entries(pairs || {})
    .filter(([pair]) => {
      const nodes = pair.split('-');
      return nodes.includes(pivot);
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

// Gestion de la mémoire structurale
class StructuralMemory {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = this.load();
    this.decayFactor = 0.97; // Désactivation progressive
    this.purgeThreshold = 0.1; // Purge les liens < 0.1
  }
  
  load() {
    try {
      return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    } catch (error) {
      return {
        pivots: {},
        liens: {},
        lastUpdated: null,
        stats: { totalInteractions: 0, activePivots: 0, activeLinks: 0 }
      };
    }
  }
  
  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      // En serverless (Vercel), l'écriture échoue - c'est normal
      // La mémoire est volatile mais l'API fonctionne toujours
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️  Impossible d\'écrire graph.json:', error.message);
      }
    }
  }
  
  updatePivot(pivot) {
    if (!this.data.pivots[pivot]) {
      this.data.pivots[pivot] = { count: 0, weight: 1, lastSeen: null };
    }
    
    const entry = this.data.pivots[pivot];
    entry.count += 1;
    entry.weight = Math.min(entry.weight + 0.1, 1.0); // Max 1.0
    entry.lastSeen = new Date().toISOString();
    
    this.data.stats.totalInteractions += 1;
    this.data.lastUpdated = new Date().toISOString();
  }
  
  updateLink(pair, score) {
    if (!this.data.liens[pair]) {
      this.data.liens[pair] = 0;
    }
    this.data.liens[pair] += score;
  }
  
  applyDecay() {
    // Désactivation progressive (0.97x)
    Object.keys(this.data.pivots).forEach(pivot => {
      this.data.pivots[pivot].weight *= this.decayFactor;
    });
    
    Object.keys(this.data.liens).forEach(pair => {
      this.data.liens[pair] *= this.decayFactor;
    });
  }
  
  purge() {
    // Supprime liens trop faibles
    Object.keys(this.data.liens).forEach(pair => {
      if (this.data.liens[pair] < this.purgeThreshold) {
        delete this.data.liens[pair];
      }
    });
    
    // Supprime pivots trop faibles
    Object.keys(this.data.pivots).forEach(pivot => {
      if (this.data.pivots[pivot].weight < this.purgeThreshold) {
        delete this.data.pivots[pivot];
      }
    });
    
    // Recalcule stats
    this.data.stats.activePivots = Object.keys(this.data.pivots).length;
    this.data.stats.activeLinks = Object.keys(this.data.liens).length;
  }
  
  getMemoryContext(pivot) {
    const topLinks = filterPivotLinks(this.data.liens, pivot, 3);
    
    const context = topLinks.length > 0
      ? `Le pivot "${pivot}" s'est manifesté ${this.data.pivots[pivot]?.count || 0} fois. Ses échos : ${topLinks.map(([p, s]) => `${p} (${s.toFixed(1)})`).join(', ')}`
      : `Première rencontre avec "${pivot}".`;
    
    return context;
  }
}

function callNebiusChat(payload) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.NEBIUS_API_KEY;

    if (!apiKey) {
      reject(new Error('NEBIUS_API_KEY manquant dans les variables d’environnement'));
      return;
    }

    const requestBody = JSON.stringify(payload);

    const options = {
      hostname: 'api.tokenfactory.nebius.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const nebReq = https.request(options, nebRes => {
      let data = '';

      nebRes.on('data', chunk => {
        data += chunk;
      });

      nebRes.on('end', () => {
        if (nebRes.statusCode < 200 || nebRes.statusCode >= 300) {
          reject(new Error(`Nebius API error ${nebRes.statusCode}: ${data}`));
          return;
        }

        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (error) {
          reject(new Error('Impossible de parser la réponse Nebius'));
        }
      });
    });

    nebReq.on('error', reject);
    nebReq.write(requestBody);
    nebReq.end();
  });
}

const memoryPath = path.join(__dirname, '..', 'graph.json');
const memory = new StructuralMemory(memoryPath);

// Mémoire courte frugale (dernier messages)
const SHORT_TERM_LIMIT = 10;
const shortTermMemory = {
  messages: [],
  totalFreq: {},
  totalPairs: {},
  stability: {},
  lastTokens: []
};

function cloneCounts(map) {
  return Object.keys(map || {}).reduce((acc, key) => {
    acc[key] = map[key];
    return acc;
  }, {});
}

function updateShortTermStats(tokens) {
  const previousTotals = cloneCounts(shortTermMemory.totalFreq);

  // Supprime message le plus ancien si limite atteinte
  if (shortTermMemory.messages.length >= SHORT_TERM_LIMIT) {
    const oldest = shortTermMemory.messages.shift();
    Object.entries(oldest.freq).forEach(([word, count]) => {
      shortTermMemory.totalFreq[word] = (shortTermMemory.totalFreq[word] || 0) - count;
      if (shortTermMemory.totalFreq[word] <= 0) delete shortTermMemory.totalFreq[word];
    });

    Object.entries(oldest.pairs).forEach(([pair, count]) => {
      shortTermMemory.totalPairs[pair] = (shortTermMemory.totalPairs[pair] || 0) - count;
      if (shortTermMemory.totalPairs[pair] <= 0) delete shortTermMemory.totalPairs[pair];
    });
  }

  // Fréquences et co-occurrences du message courant
  const freq = computeFrequencies(tokens);
  const pairs = coWordAnalysis(tokens).pairs;

  // Mise à jour des totaux glissants
  Object.entries(freq).forEach(([word, count]) => {
    shortTermMemory.totalFreq[word] = (shortTermMemory.totalFreq[word] || 0) + count;
  });

  Object.entries(pairs).forEach(([pair, count]) => {
    shortTermMemory.totalPairs[pair] = (shortTermMemory.totalPairs[pair] || 0) + count;
  });

  shortTermMemory.messages.push({ freq, pairs, tokens: [...tokens] });

  // Delta = différence entre les totaux avant/après ce message
  const delta = {};
  const allWords = new Set([...Object.keys(shortTermMemory.totalFreq), ...Object.keys(previousTotals)]);
  allWords.forEach(word => {
    const before = previousTotals[word] || 0;
    const after = shortTermMemory.totalFreq[word] || 0;
    const diff = after - before;
    if (diff !== 0) {
      delta[word] = diff;
    }
  });

  // Stabilité = nombre de messages consécutifs où le mot apparaît
  const prevTokensSet = new Set(shortTermMemory.lastTokens);
  const currentTokensSet = new Set(tokens);
  const nextStability = {};

  currentTokensSet.forEach(word => {
    const previousStreak = prevTokensSet.has(word) ? shortTermMemory.stability[word] || 1 : 0;
    nextStability[word] = previousStreak + 1;
  });

  // Force de lien = cooccurrence / max(freqA, freqB) sur la mémoire glissante
  const forceLiens = {};
  Object.entries(shortTermMemory.totalPairs).forEach(([pair, count]) => {
    const [a, b] = pair.split('-');
    const denom = Math.max(shortTermMemory.totalFreq[a] || 1, shortTermMemory.totalFreq[b] || 1);
    if (denom > 0) {
      forceLiens[pair] = Number((count / denom).toFixed(3));
    }
  });

  shortTermMemory.stability = nextStability;
  shortTermMemory.lastTokens = [...tokens];

  return { delta, stability: nextStability, forceLiens };
}

/**
 * Tokenise un texte en mots significatifs
 * @param {string} text - Texte à tokeniser
 * @returns {string[]} - Tableau de tokens
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
}

/**
 * Calcule les fréquences des mots
 * @param {string[]} tokens - Tokens à analyser
 * @returns {Object} - {mot: fréquence}
 */
function computeFrequencies(tokens) {
  const freq = {};
  tokens.forEach(token => {
    freq[token] = (freq[token] || 0) + 1;
  });
  return freq;
}

/**
 * Co-word analysis avancé (Courtial/Callon)
 * Construit un graphe actant-actant avec centralité
 * @param {string[]} tokens - Tokens
 * @param {number} windowSize - Taille de la fenêtre
 * @returns {Object} - {pairs, nodeScores, adjacency}
 */
function coWordAnalysis(tokens, windowSize = 3) {
  const cowords = {};
  const adjacency = {}; // {word: [connected_words]}
  
  // Initialise adjacency pour tous les tokens uniques
  const uniqueTokens = [...new Set(tokens)];
  uniqueTokens.forEach(token => {
    adjacency[token] = [];
  });
  
  // Co-word avec fenêtre glissante
  for (let i = 0; i < tokens.length - 1; i++) {
    const window = tokens.slice(i, i + windowSize);
    
    for (let j = 0; j < window.length; j++) {
      for (let k = j + 1; k < window.length; k++) {
        const pair = [window[j], window[k]].sort().join('-');
        cowords[pair] = (cowords[pair] || 0) + 1;
        
        // Ajoute connexions bidirectionnelles
        if (!adjacency[window[j]].includes(window[k])) {
          adjacency[window[j]].push(window[k]);
        }
        if (!adjacency[window[k]].includes(window[j])) {
          adjacency[window[k]].push(window[j]);
        }
      }
    }
  }
  
  // Calcule score de centralité simplifié (nombre de liaisons)
  const nodeScores = {};
  uniqueTokens.forEach(token => {
    nodeScores[token] = adjacency[token].length;
  });
  
  return {
    pairs: cowords,
    nodeScores,
    adjacency
  };
}

/**
 * Identifie le pivot = mot avec meilleure connectivité
 * @param {Object} frequencies - Fréquences
 * @param {Object} cowordData - {pairs, nodeScores, adjacency}
 * @returns {string} - Le pivot
 */
function findPivot(frequencies, cowordData) {
  const { nodeScores } = cowordData;
  
  // Combine fréquence et connectivité
  const scores = {};
  Object.keys(frequencies).forEach(word => {
    const connectivity = nodeScores[word] || 0;
    const frequency = frequencies[word];
    // Pivot = mot haute fréquence ET haute connectivité
    scores[word] = (frequency * 0.6) + (connectivity * 0.4);
  });
  
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || 'essence';
}

/**
 * Sépare noyau (fréquence haute) et périphérie (fréquence basse)
 * @param {Object} frequencies - Fréquences
 * @returns {Object} - {noyau: [], peripherie: []}
 */
function separateByFrequency(frequencies) {
  const sorted = Object.entries(frequencies)
    .sort((a, b) => b[1] - a[1]);
  
  const threshold = Math.max(1, Math.ceil(sorted.length * 0.3));
  
  return {
    noyau: sorted.slice(0, threshold).map(([word]) => word),
    peripherie: sorted.slice(threshold).map(([word]) => word)
  };
}

/**
 * Génère un écho résonant unique avec patterns variés selon le mode
 * @param {string} pivot - Mot pivot
 * @param {string[]} noyau - Noyau
 * @param {string[]} peripherie - Périphérie
 * @param {string} mode - Mode: neutral|hypno|ado|etp (défaut: neutral)
 * @returns {Object} - {echo, metaphor, question}
 */
function generateEcho(pivot, noyau, peripherie, mode = 'neutral') {
  // Valide le mode
  if (!VALID_MODES.includes(mode)) {
    mode = 'neutral';
  }
  
  const neutralPatterns = PATTERNS.neutral || {};
  const modePatterns = PATTERNS[mode] || neutralPatterns;

  const metaphors = modePatterns.metaphors?.length ? modePatterns.metaphors : neutralPatterns.metaphors || ['comme une onde qui se propage'];
  const openQuestions = modePatterns.openQuestions?.length ? modePatterns.openQuestions : neutralPatterns.openQuestions || ['Que signifie cela pour vous?'];
  const sentenceStructures = modePatterns.sentenceStructures?.length ? modePatterns.sentenceStructures : neutralPatterns.sentenceStructures || ['Le cœur: {pivot}. Résonnances: {cowords}.'];

  // Sélectionne structure aléatoire contrôlée
  const structureIndex = Math.floor(Math.random() * sentenceStructures.length);
  const structure = sentenceStructures[structureIndex];

  // Sélectionne métaphore aléatoire
  const metaphorIndex = Math.floor(Math.random() * metaphors.length);
  const metaphor = metaphors[metaphorIndex];

  // Sélectionne question aléatoire
  const questionIndex = Math.floor(Math.random() * openQuestions.length);
  const question = openQuestions[questionIndex];
  
  // Prépare co-words (les 2-3 premiers du noyau)
  const cowords = noyau.slice(0, 3).join(', ') || peripherie[0] || 'essence';
  const noyauText = noyau.length ? noyau.join(', ') : pivot;
  const peripherieText = peripherie.length ? peripherie.join(', ') : cowords;

  // Génère l'écho en remplaçant les placeholders
  const echo = structure
    .replace(/{pivot}/g, pivot)
    .replace(/{{pivot}}/g, pivot)
    .replace(/{cowords}/g, cowords)
    .replace(/{{cowords}}/g, cowords)
    .replace(/{noyau}/g, noyauText)
    .replace(/{{noyau}}/g, noyauText)
    .replace(/{peripherie}/g, peripherieText)
    .replace(/{{peripherie}}/g, peripherieText)
    .replace(/{meta}/g, metaphor)
    .replace(/{{meta}}/g, metaphor)
    .replace(/{question}/g, question)
    .replace(/{{question}}/g, question);

  return {
    echo,
    metaphor,
    question,
    mode
  };
}

async function handleChatRequest(req, res) {
  const sendError = (status, message) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message }));
  };

  let body = '';
  try {
    body = await readRequestBody(req);
  } catch (error) {
    sendError(500, 'Impossible de lire la requête');
    return;
  }

  let payload;
  try {
    payload = body ? JSON.parse(body) : {};
  } catch (error) {
    sendError(400, 'Invalid JSON body');
    return;
  }

  const allowedKeys = ['message', 'messages', 'temperature', 'top_p', 'max_tokens', 'systemPrompt'];
  const extraKeys = Object.keys(payload).filter(key => !allowedKeys.includes(key));
  if (extraKeys.length > 0) {
    sendError(400, `Unexpected field(s): ${extraKeys.join(', ')}`);
    return;
  }

  const { message, messages = [], temperature = 0.7, top_p = 0.9, max_tokens = 256, systemPrompt } = payload;

  if (message !== undefined && typeof message !== 'string') {
    sendError(400, 'message must be a string when provided');
    return;
  }

  if (!Array.isArray(messages)) {
    sendError(400, 'messages must be an array');
    return;
  }

  const sanitizedHistory = messages
    .map(entry => ({ role: entry.role, content: entry.content }))
    .filter(entry => ['user', 'assistant'].includes(entry.role) && typeof entry.content === 'string' && entry.content.trim().length > 0)
    .map(entry => ({ role: entry.role, content: entry.content.trim() }));

  const chatMessages = [
    { role: 'system', content: systemPrompt || DEFAULT_SYSTEM_PROMPT },
    ...sanitizedHistory
  ];

  if (typeof message === 'string' && message.trim()) {
    chatMessages.push({ role: 'user', content: message.trim() });
  }

  const hasUserMessage = chatMessages.some(m => m.role === 'user');
  if (!hasUserMessage) {
    sendError(400, 'At least one user message is required');
    return;
  }

  if (typeof temperature !== 'number' || temperature < 0 || temperature > 1) {
    sendError(400, 'temperature must be a number between 0 and 1');
    return;
  }

  if (typeof top_p !== 'number' || top_p <= 0 || top_p > 1) {
    sendError(400, 'top_p must be a number between 0 and 1');
    return;
  }

  if (typeof max_tokens !== 'number' || max_tokens <= 0 || max_tokens > 2000) {
    sendError(400, 'max_tokens must be a positive number (max 2000)');
    return;
  }

  const nebMessages = chatMessages.map(message => ({
    role: message.role,
    content: message.role === 'system'
      ? message.content
      : [{ type: 'text', text: message.content }]
  }));

  const nebPayload = {
    model: 'google/gemma-2-2b-it',
    messages: nebMessages,
    temperature,
    top_p,
    max_tokens
  };

  try {
    const completion = await callNebiusChat(nebPayload);
    const reply = completion?.choices?.[0]?.message?.content || '';

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      reply,
      model: completion?.model || nebPayload.model,
      usage: completion?.usage || null,
      messagesSent: chatMessages.length
    }, null, 2));
  } catch (error) {
    sendError(502, error.message);
  }
}

/**
 * Traite une requête POST /api/echo
 */
function handleEchoRequest(req, res) {
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    const sendError = (status, message) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: message }));
    };

    const validatePayload = payload => {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return 'Invalid JSON body';
      }

      const allowedKeys = ['message', 'mode', 'disableMemory'];
      const extraKeys = Object.keys(payload).filter(key => !allowedKeys.includes(key));
      if (extraKeys.length > 0) {
        return `Unexpected field(s): ${extraKeys.join(', ')}`;
      }

      if (typeof payload.message !== 'string') {
        return 'message is required and must be a string';
      }

      const trimmed = payload.message.trim();
      if (trimmed.length < 3 || trimmed.length > 2000) {
        return 'message must be between 3 and 2000 characters';
      }

      if (payload.mode !== undefined && !VALID_MODES.includes(payload.mode)) {
        return 'mode is invalid';
      }

      if (payload.disableMemory !== undefined && typeof payload.disableMemory !== 'boolean') {
        return 'disableMemory must be a boolean';
      }

      return null;
    };

    let payload;
    try {
      payload = body ? JSON.parse(body) : {};
    } catch (error) {
      sendError(400, 'Invalid JSON body');
      return;
    }

    const validationError = validatePayload(payload);
    if (validationError) {
      sendError(400, validationError);
      return;
    }

    const sanitizedMessage = payload.message.trim();
    const { mode, disableMemory = false } = payload;

    try {
      // Analyse
      const tokens = tokenize(sanitizedMessage);

      if (tokens.length === 0) {
        sendError(400, 'message must contain at least one meaningful word');
        return;
      }

      const frequencies = computeFrequencies(tokens);
      const cowordData = coWordAnalysis(tokens);
      const pivot = findPivot(frequencies, cowordData);
      const { noyau, peripherie } = separateByFrequency(frequencies);
      const { echo, metaphor, question, mode: appliedMode } = generateEcho(pivot, noyau, peripherie, mode);

      // Mémoire courte statistique (10 derniers messages)
      const { delta, stability, forceLiens } = updateShortTermStats(tokens);
      
      // Mise à jour mémoire (avant decay)
      if (!disableMemory) {
        memory.updatePivot(pivot);
        Object.entries(cowordData.pairs).forEach(([pair, score]) => {
          memory.updateLink(pair, score);
        });
        
        // Applique decay et purge (tous les 10 appels)
        if (memory.data.stats.totalInteractions % 10 === 0) {
          memory.applyDecay();
          memory.purge();
        }
        
        memory.save();
      }
      
      // Récupère contexte mémoire
      const memoireContext = disableMemory ? null : memory.getMemoryContext(pivot);
      
      // Prépare les liens (top pairs seulement)
      const topLinks = filterPivotLinks(cowordData.pairs, pivot, 8)
        .reduce((acc, [pair, score]) => {
          acc[pair] = score;
          return acc;
        }, {});
      
      // Réponse
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        pivot,
        noyau,
        peripherie,
        echo,
        metaphor,
        question,
        mode: appliedMode,
        liens: topLinks,
        forceLiens,
        delta,
        stabilite: stability,
        centralite: cowordData.nodeScores[pivot] || 0,
        memoire: memoireContext
      }, null, 2));
      
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

// Handler HTTP exporté pour environnements serverless (Vercel, etc.)
function handler(req, res) {
  const parsedUrl = url.parse(req.url || '/', true);

  const sendHealth = () => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      version: '0.3.0',
      endpoints: ['/api/echo (POST)', '/api/chat (POST)'],
      frontend: '/',
      nebius: {
        enabled: Boolean(process.env.NEBIUS_API_KEY),
        model: 'Qwen/Qwen3-32B'
      }
    }));
  };

  // CORS basique
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check pour Vercel
  if (req.method === 'GET' && (parsedUrl.pathname === '/api/echo' || parsedUrl.pathname === '/health')) {
    sendHealth();
    return;
  }

  if (req.method === 'GET' && !parsedUrl.pathname.startsWith('/api/')) {
    if (['/', '/ui', '/chat'].includes(parsedUrl.pathname)) {
      serveFrontend(res);
      return;
    }

    const served = serveStatic(res, parsedUrl.pathname || '/');
    if (served) return;
  }

  if (req.method === 'POST') {
    if (parsedUrl.pathname === '/api/chat') {
      handleChatRequest(req, res);
      return;
    }

    // Pour les environnements serverless, on accepte POST direct sur la fonction
    handleEchoRequest(req, res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
}

// Si lancé directement (`node api/echo.js`), démarre un serveur HTTP local
if (require.main === module) {
  const server = http.createServer(handler);
  server.listen(PORT, () => {
    console.log(`🎵 RésonancIA API démarrée sur http://localhost:${PORT}`);
    console.log(`POST /api/echo pour tester`);
  });
}

module.exports = handler;
module.exports.handleChatRequest = handleChatRequest;
