# 🚀 Déploiement sur Vercel

## Option 1 : CLI Vercel (recommandé)

### 1. Installer Vercel CLI

```bash
npm i -g vercel
```

### 2. Se connecter à Vercel

```bash
vercel login
```

Suivez les instructions pour vous authentifier via GitHub/GitLab/Bitbucket.

### 3. Déployer

```bash
# Déploiement en staging (preview)
vercel

# Déploiement en production
vercel --prod
```

Vercel va :
- Détecter automatiquement `vercel.json`
- Construire et déployer votre API
- Vous donner une URL de production

### 4. Tester en production

```bash
# Remplacez resonancia-api.vercel.app par votre URL réelle
curl -X POST https://resonancia-api.vercel.app/api/echo \
  -H "Content-Type: application/json" \
  -d '{"message": "Je suis calme mais inquiet à l'\''idée de changer de vie"}'
```

---

## Option 2 : GitHub Integration (ci-cd)

### 1. Connecter le repo GitHub à Vercel

Allez sur https://vercel.com/new et sélectionnez votre repo `resonanceia`.

### 2. Configuration auto

Vercel va :
- Détecter `vercel.json`
- Configurer automatiquement
- Déployer chaque push sur `main`

### 3. URL de production

Vous recevrez une URL du type :
```
https://resonancia-api-{hash}.vercel.app/api/echo
```

---

## Vérification post-déploiement

### Tester l'endpoint

```bash
# Test basique
curl -X POST https://votre-url.vercel.app/api/echo \
  -H "Content-Type: application/json" \
  -d '{"message":"Bonjour RésonancIA"}'

# Test avec mode spécifique
curl -X POST https://votre-url.vercel.app/api/echo \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Je suis calme mais inquiet à l'\''idée de changer de vie",
    "mode": "neutral"
  }' | jq .
```

### Vérifier les logs

Dans le dashboard Vercel :
1. Allez sur votre projet
2. Onglet "Deployments"
3. Cliquez sur le déploiement
4. Onglet "Logs" pour voir les erreurs

### Tester les modes

```bash
# Mode neutral
curl -X POST https://votre-url.vercel.app/api/echo \
  -H "Content-Type: application/json" \
  -d '{"message":"Je cherche du sens","mode":"neutral"}'

# Mode hypno
curl -X POST https://votre-url.vercel.app/api/echo \
  -H "Content-Type: application/json" \
  -d '{"message":"Je cherche du sens","mode":"hypno"}'

# Mode ado
curl -X POST https://votre-url.vercel.app/api/echo \
  -H "Content-Type: application/json" \
  -d '{"message":"C'\''est fou!","mode":"ado"}'

# Mode etp
curl -X POST https://votre-url.vercel.app/api/echo \
  -H "Content-Type: application/json" \
  -d '{"message":"J'\''aime apprendre","mode":"etp"}'
```

---

## Variables d'environnement (optionnel)

Si vous besoin de variables d'env, ajoutez dans le dashboard Vercel :
1. Settings → Environment Variables
2. Ajoutez vos variables
3. Re-déployez

---

## Limitation Vercel

⚠️ **Mémoire volatile** : La mémoire (graph.json) n'est pas persistée entre les appels en serverless. C'est normal et **souhaité** pour la scalabilité. Chaque fonction démarre avec une mémoire vierge.

Pour persister la mémoire, vous pourriez :
- Utiliser une base de données externe (Firebase, MongoDB, etc.)
- Ajouter Redis/Upstash pour la cache
- (Ce n'est pas implémenté dans la version actuelle)

---

## Débogage

Si le déploiement échoue :

1. **Vérifier la syntaxe** :
   ```bash
   node -c api/echo.js
   node -e "console.log(JSON.stringify(require('./vercel.json'), null, 2))"
   ```

2. **Vérifier les logs Vercel** :
   - Dashboard → Deployments → Logs onglet

3. **Test local avant déploiement** :
   ```bash
   npm start
   curl -X POST http://localhost:3000/api/echo \
     -H "Content-Type: application/json" \
     -d '{"message":"test"}'
   ```

4. **Problèmes courants** :
   - JSON malformé dans vercel.json → Valider avec `jq`
   - Fichiers manquants → Vérifier `.vercelignore`
   - Dépendances manquantes → Vérifier `package.json`
