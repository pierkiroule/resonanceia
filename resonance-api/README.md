# Le Ciel Étoilé — API Résonante

API Express modulaire qui trace des co-occurrences inspirées de Courtial & Callon. Elle produit une constellation textuelle, calcule fréquences, centralités, delta par rapport à l’état précédent et enregistre tout dans des fichiers JSON.

## Ce que fait l’API
- **Tokenisation frugale** avec nettoyage des stopwords français.
- **Matrice de co-occurrence NxN** conservant les 200 mots les plus fréquents (persistée dans `db/matrix.json`).
- **Fréquences brutes** par mot (`db/freq.json`).
- **Centralité degré** (somme des co-occurrences) et **delta** vs. dernier snapshot (`db/history.json`).
- **Réponse poétique neutre** : pivot, orbites triées, fréquence du pivot, centralité, variation, métaphore légère et constellation d’emojis.
- **Endpoints épurés** + fichier `openapi.yaml` compatible GPT Actions.

## Structure
```
resonance-api/
├─ package.json
├─ server.js
├─ lib/
│  ├─ tokenizer.js
│  ├─ cooccurrence.js
│  ├─ metrics.js
│  └─ metaphor.js
├─ db/
│  ├─ matrix.json
│  ├─ freq.json
│  └─ history.json
└─ openapi.yaml
```

## Installation & démarrage
1. Aller dans le dossier `resonance-api` :
   ```bash
   cd resonance-api
   npm install
   npm start
   ```
2. L’API écoute par défaut sur `http://localhost:3000`.

## Endpoints
- `POST /api/ciel`
  - Body `{ "text": "..." }`
  - Met à jour fréquences + matrice, calcule centralité/delta et renvoie la constellation :
    ```json
    {
      "pivot": "mot",
      "orbites": [{ "mot": "autre", "force": 3 }],
      "freqPivot": 4,
      "centralite": 7,
      "variation": 2,
      "metaphore": "...",
      "constellation": ["🌌 neutralité", "..."]
    }
    ```
- `POST /api/ciel/image` : stub indiquant que la partie visuelle est en attente.
- `POST /api/reset` : remet `freq.json`, `matrix.json` et `history.json` à zéro.
- `GET /api/state` : renvoie l’état brut (debug).

## Pourquoi la co-occurrence ?
- Elle mesure la **coprésence** de termes sans interpréter leur sens.
- La centralité degré offre une vue simple sur les nœuds les plus connectés.
- Le delta montre les glissements de résonance entre deux requêtes successives.

## Neutralité et prudence
- La métaphore reste **non interprétative**, seulement descriptive et poétique.
- Pas de diagnostic, pas de jugement : l’API se limite aux co-émergences observées.
- Les données restent locales (fichiers JSON), sans base de données externe.

## Réinitialisation & limites
- `POST /api/reset` efface la mémoire pour repartir d’un ciel clair.
- La matrice est plafonnée à 200 mots pour rester légère.
