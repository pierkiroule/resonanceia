# RésonancIA API

Analyse sémantique et génération d'échos résonants — **sans framework**.

## 📋 Vision

RésonancIA est une API léthargique et poétique qui :
- Analyse la **structure sémantique** de vos messages
- Identifie le **pivot** (mot le plus connectif)
- Sépare le **noyau** (concepts centraux) de la **périphérie** (détails)
- Génère un **écho résonant** unique à chaque appel

## 🚀 Quick Start

```bash
npm install
npm start
```

Testez avec curl :

```bash
curl -X POST http://localhost:3000/api/echo \
  -H "Content-Type: application/json" \
  -d '{"message":"Je cherche du sens dans ce monde complexe"}'
```

## 📡 API

### POST `/api/echo`

**Body:**
```json
{
  "message": "Votre texte ici"
}
```

**Response:**
```json
{
  "pivot": "sens",
  "noyau": ["monde", "complexe"],
  "peripherie": ["cherche", "je"],
  "echo": "Le cœur de votre message : sens. Cela résonne avec : monde, complexe."
}
```

### POST `/api/chat`

Proxy léger vers Nebius Studio (modèle `Qwen/Qwen3-32B`).

**Body minimal:**
```json
{
  "message": "Je me sens très anxieux depuis quelques jours.",
  "temperature": 0.7,
  "top_p": 0.9,
  "max_tokens": 256
}
```

Vous pouvez aussi passer l'historique sous forme de tableau `messages` (objets `{role, content}`), il sera enrichi d'un prompt système par défaut.

> ℹ️ Nécessite la variable d'environnement `NEBIUS_API_KEY`.

## 🏗️ Architecture

```
resonancia-api/
  api/
    echo.js          # Serveur HTTP et logique d'analyse
  package.json       # Dépendances
  openapi.json       # Spec OpenAPI
  README.md          # Cette doc
```

## 🔍 Fonctionnalités (v0.1)

- ✅ Tokenisation simple
- ✅ Fréquences des mots
- ✅ Co-word analysis (fenêtre glissante)
- ✅ Identification pivot (connectivité)
- ✅ Noyau / périphérie
- ✅ Génération écho basique

## 🚧 Prochaines étapes

- [ ] Patterns avancés et variations de langage
- [ ] Co-word Courtial/Callon (centralité)
- [ ] Mémoire douce (graph.json)
- [ ] Modes multi-profiles (neutral, hypno, ado, etp)
- [x] Déploiement Vercel
 - Handler serverless (`api/echo.js`) avec auto-détection Vercel (config minimale `vercel.json`)
 - Runtime Node 24 (aligné via `package.json` / `.nvmrc`) et `.vercelignore` pour alléger le bundle
- [ ] Tests automatiques
- [ ] Garanties RGPD

## 📋 Spécifications futures

Voir `openapi.json` pour la spec complète (en cours de développement).

---

**RésonancIA** — Quand les mots deviennent réseau.

## 🔁 Déploiement Vercel

Le projet est prêt pour un déploiement serverless sur Vercel.

La configuration minimale (`vercel.json` avec uniquement `version: 2`) laisse Vercel auto-servir `index.html` à la racine et détecter automatiquement les routes API dans `api/*.js`.

Commandes rapides:

```bash
# installer vercel (si nécessaire)
npm i -g vercel

# déployer (suivez les instructions interactive la première fois)
vercel --prod
```

La fonction principale est `api/echo.js` et la route `/api/echo` est exposée automatiquement (les routes API étant détectées sans configuration custom).
Le runtime Node 24 est forcé via `package.json` et `.nvmrc`, et `.vercelignore` exclut les dossiers de travail locaux.
La configuration minimale (`vercel.json` avec uniquement `version: 2`) suffit pour servir `index.html` à la racine et exposer automatiquement les handlers API (`api/*.js`), sans réécritures supplémentaires.
