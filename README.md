# API Écho Résonante (Courtial/Callon)

Application Express minimaliste :
- `POST /api/push` : reçoit un texte, extrait les termes, stocke en SQLite et renvoie pivot/noyau/périphérie + clusters emoji.
- `GET /api/graph` : retourne les nodes/links du graph Courtial (occurrences + cooccurrences).
- `public/dashboard.html` : visualisation temps réel (liste top 10 + SVG simple), rafraîchie toutes les 4s.

## Démarrage local
```bash
npm install
npm start
# http://localhost:3000
```

Tester rapidement :
```bash
curl -X POST http://localhost:3000/api/push \
  -H "Content-Type: application/json" \
  -d '{"message":"angoisse controle respiration"}'

curl http://localhost:3000/api/graph
```

## Modèle de données
Base SQLite `data/resonance.db`, table unique `terms` :
| champ | type | usage |
| --- | --- | --- |
| id | integer | PK |
| word | text | terme ou 1er élément d'un bigramme |
| pair | text/null | 2e élément du bigramme (NULL si unigramme) |
| count | integer | occurrences cumulées |
| last_seen | integer | timestamp ms |
| weight | real | pondération cumulée |

## OpenAPI
Schéma statique disponible via `GET /openapi.json` et dans `public/openapi.json`.

## Déploiement Render
- Build : `npm install`
- Start : `npm start`
- Node 18+
