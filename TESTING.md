# 🧪 Guide de test - RésonancIA API

## Test local rapide

```bash
# Lancer l'API
npm start

# Dans un autre terminal, tester avec le script de test
node test-api.js 0    # Mode neutral
node test-api.js 1    # Mode hypno
node test-api.js 2    # Mode ado
node test-api.js 3    # Mode etp
node test-api.js 4    # Sans mémoire
```

## Test avec curl

### Mode neutral (équilibré)

```bash
curl -X POST http://localhost:3000/api/echo \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Je cherche du sens dans ce monde complexe",
    "mode": "neutral"
  }'
```

**Réponse attendue :** Écho poétique et équilibré avec métaphore classique.

### Mode hypno (apaisant)

```bash
curl -X POST http://localhost:3000/api/echo \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Je cherche du sens dans ce monde complexe",
    "mode": "hypno"
  }'
```

**Réponse attendue :** Écho doux, murmures, invitations à la détente.

### Mode ado (énergique)

```bash
curl -X POST http://localhost:3000/api/echo \
  -H "Content-Type: application/json" \
  -d '{
    "message": "C'\''est trop cool ce truc ouf!",
    "mode": "ado"
  }'
```

**Réponse attendue :** Langage jeune, intensité, enthousiasme.

### Mode etp (bienveillant)

```bash
curl -X POST http://localhost:3000/api/echo \
  -H "Content-Type: application/json" \
  -d '{
    "message": "J'\''aime apprendre et découvrir",
    "mode": "etp"
  }'
```

**Réponse attendue :** Ton éducatif, encourageant, positif.

### Désactiver la mémoire

```bash
curl -X POST http://localhost:3000/api/echo \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test anonyme",
    "disableMemory": true
  }'
```

**Réponse attendue :** `memoire: null` (pas de contexte mémorisé).

## Structure de réponse

```json
{
  "pivot": "word",           // Mot clé identifié
  "noyau": ["word1", "word2"],  // Concepts centraux
  "peripherie": ["word3", "word4"],  // Détails
  "echo": "Generated text",   // Écho poétique
  "metaphor": "poetic metaphor",  // Métaphore associée
  "question": "open question",    // Question pour approfondir
  "mode": "neutral|hypno|ado|etp",  // Mode appliqué
  "liens": {                  // Paires co-word avec scores
    "word1-word2": 3,
    "word2-word3": 2
  },
  "centralite": 5,           // Score connectivité du pivot
  "memoire": "memory context"  // Historique (null si disableMemory=true)
}
```

## Tests avancés

### Avec jq (parsing JSON)

```bash
curl -s -X POST http://localhost:3000/api/echo \
  -H "Content-Type: application/json" \
  -d '{"message":"Test","mode":"neutral"}' | jq '.echo'
```

### Tester plusieurs modes en boucle

```bash
for mode in neutral hypno ado etp; do
  echo "=== Mode: $mode ==="
  curl -s -X POST http://localhost:3000/api/echo \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"Je cherche du sens\",\"mode\":\"$mode\"}" \
    | jq '.{mode,echo,metaphor}'
done
```

### Mesurer le temps de réponse

```bash
curl -w "\nTemps: %{time_total}s\n" \
  -X POST http://localhost:3000/api/echo \
  -H "Content-Type: application/json" \
  -d '{"message":"Test performance"}'
```

## Validation

L'API doit :
- ✅ Retourner un JSON valide
- ✅ Identifier un pivot pertinent
- ✅ Séparer noyau et périphérie correctement
- ✅ Générer un écho unique à chaque appel (aléatoire)
- ✅ Adapter le contenu au mode choisi
- ✅ Mémoriser les pivots (si memory activée)
- ✅ Gérer les erreurs gracieusement (message vide, mode invalide, etc.)

## Déploiement Vercel

Une fois testé localement, déployez avec :

```bash
vercel --prod
```

Testez la version en production :

```bash
curl -X POST https://resonancia-api.vercel.app/api/echo \
  -H "Content-Type: application/json" \
  -d '{"message":"Test production"}'
```

---

**Note :** La mémoire (graph.json) n'est pas persistée sur Vercel (serverless). Chaque fonction démarrante commence avec une mémoire vierge. C'est normal et souhaité pour la scalabilité.
