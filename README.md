# API ÉCHO

Refonte minimale pour utiliser l’analyse statistique locale comme Action ChatGPT.

## Endpoint unique
`POST /api/echo`

Corps JSON :
```json
{ "message": "je suis anxieux" }
```

Réponse type :
```json
{
  "pivot": "anxieux",
  "noyau": ["je", "suis", "..."],
  "peripherie": ["texte", "unique"],
  "cooccurrences": { "je": 1, "suis": 1 },
  "centralite": 3,
  "metaphore": "comme un ciel en attente",
  "echo": "Tes mots gravitent autour de « anxieux », là où anxieux rencontre je et suis",
  "tags": ["#pivot", "#noyau", "#emotion"]
}
```

## Connecter à ChatGPT Actions
1. Déployez l’API (Vercel ou local via `vercel dev`).
2. Dans les paramètres Actions de ChatGPT, fournissez l’URL de `https://votre-domaine/openapi.json`.
3. Ajoutez un appel exemple comme ci-dessous pour valider la connexion.

Exemple de requête :
```bash
curl -X POST https://votre-domaine/api/echo \
  -H "Content-Type: application/json" \
  -d '{"message":"je suis anxieux"}'
```

## Notes
- Aucun moteur génératif externe n’est utilisé.
- CORS est activé pour permettre l’appel direct depuis ChatGPT.
