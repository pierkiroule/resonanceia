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
- [ ] Déploiement Vercel
 - [x] Déploiement Vercel préparation: `vercel.json` ajouté, handler serverless
- [ ] Tests automatiques
- [ ] Garanties RGPD

## 📋 Spécifications futures

Voir `openapi.json` pour la spec complète (en cours de développement).

---

**RésonancIA** — Quand les mots deviennent réseau.

## 🔁 Déploiement Vercel

Le projet est prêt pour un déploiement serverless sur Vercel.

Commandes rapides:

```bash
# installer vercel (si nécessaire)
npm i -g vercel

# déployer (suivez les instructions interactive la première fois)
vercel --prod
```

La fonction principale est `api/echo.js` et la route `/api/echo` est exposée par `vercel.json`.