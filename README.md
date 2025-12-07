# Webapp ÉCHO (Render-ready)

Application Express minimaliste avec une seule API `/api/echo` et une page unique pour générer les prompts et le bloc OpenAPI destinés à GPT Builder. Aucune dépendance vers des IA externes.

## Démarrage local
```bash
npm install
npm run start
# puis ouvrir http://localhost:3000
```

## Endpoint unique
`POST /api/echo`

Corps JSON minimal :
```json
{ "message": "je me sens pris entre deux choix" }
```

Réponse type :
```json
{
  "pivot": "choix",
  "noyau": ["deux", "pris"],
  "peripherie": ["sens", "entre"],
  "centralite": 2.5,
  "cooccurrences": { "deux": 2, "pris": 1 },
  "tags": ["choix", "deux", "pris"],
  "metaphore": "comme une vibration sur un fil tendu",
  "echo": "Tes mots gravitent autour de « choix », en lien avec deux, pris."
}
```

- Toujours du JSON (pas de HTML).
- Aucun appel externe ou fallback IA.
- CORS ouvert pour simplifier l’usage depuis GPT.

## Connecter à GPT Builder
1. Déployez sur Render (commande de démarrage : `node server.js`).
2. Copiez les blocs générés par la page `http(s)://<votre-host>/` :
   - Prompt Système pour le champ "Instructions".
   - Prompt GPT Action décrivant la configuration.
   - Bloc OpenAPI JSON à importer dans l’onglet Actions (ou coller l’URL `http(s)://<votre-host>/openapi.json`).
3. L’Action unique autorisée est `POST /api/echo`.

## Fichier OpenAPI statique
Le fichier `public/openapi.json` décrit l’API et est servi à la racine du site. Il reflète exactement le comportement de l’endpoint Express.

## Déploiement Render
- Build command : `npm install`
- Start command : `npm run start`
- Node 18+.
