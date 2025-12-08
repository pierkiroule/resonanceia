# EmojiRéso•° — API d'écho sémiotique 100% emojis

API minimaliste basée sur Express + SQLite pour mesurer les cooccurrences d'emojis dans un flux conversationnel.
Aucune analyse textuelle : uniquement des structures sémiotiques calculées sur les emojis transmis.

## Endpoints
- `POST /api/emojireso` : ajoute un lot d'emojis et retourne les zones `central`, `orbit`, `isolated`, `emerging` ainsi que le graphe (nodes/links).
- `GET /api/emojireso` : récupère l'état courant du réseau sans écrire.
- `POST /api/emojireso/reset` : remet à zéro la base SQLite.

## Démarrage local
```bash
npm install
npm start
# http://localhost:3000/dashboard
```

## Exemple curl
```bash
curl -X POST http://localhost:3000/api/emojireso \
  -H "Content-Type: application/json" \
  -d '{"emojis":["😡","📚","🤯"]}'
```

Réinitialiser :
```bash
curl -X POST http://localhost:3000/api/emojireso/reset
```

## Dashboard
- Page `/dashboard` : formulaire d'envoi d'emojis, rendu force-directed (D3.js), listes central/orbit/isolated/emerging, tableau des compteurs.
- Rafraîchissement auto toutes les 6 s.

## Stockage SQLite
Base locale `data/reseau.db` avec les tables :
- `interactions` (id, session, timestamp)
- `emoji_count` (emoji, count)
- `emoji_links` (emoji1, emoji2, cooccurrence_count)

## GPT Action (exemple OpenAPI 3.1)
```yaml
openapi: 3.1.0
info:
  title: EmojiRéso
paths:
  /api/emojireso:
    post:
      summary: Ajouter un ensemble d'emojis et obtenir un écho sémiotique
      operationId: emojiso
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                emojis:
                  type: array
                  items:
                    type: string
responses:
  "200":
    description: Retour du réseau émoji en croissance
```
