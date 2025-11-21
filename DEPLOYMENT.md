# Guide de Déploiement sur Vercel

## Étapes pour déployer sur Vercel

### 1. Initialiser Git (si ce n'est pas déjà fait)

```bash
git init
git add .
git commit -m "Initial commit - La Petite Crêpière"
```

### 2. Créer un repository sur GitHub

1. Allez sur [github.com](https://github.com)
2. Cliquez sur "New repository"
3. Nommez-le (ex: `insightlpc`)
4. Ne cochez PAS "Initialize with README" (vous avez déjà du code)
5. Cliquez sur "Create repository"

### 3. Pousser votre code sur GitHub

```bash
git remote add origin https://github.com/VOTRE_USERNAME/insightlpc.git
git branch -M main
git push -u origin main
```

### 4. Déployer sur Vercel

#### Option A: Via le site web Vercel (Recommandé)

1. Allez sur [vercel.com](https://vercel.com)
2. Connectez-vous avec votre compte GitHub
3. Cliquez sur "Add New..." → "Project"
4. Sélectionnez votre repository `insightlpc`
5. Vercel détectera automatiquement que c'est un projet Vite
6. **IMPORTANT**: Ajoutez vos variables d'environnement :
   - Cliquez sur "Environment Variables"
   - Ajoutez :
     - `VITE_SUPABASE_URL` = votre URL Supabase
     - `VITE_SUPABASE_ANON_KEY` = votre clé anonyme Supabase
7. Cliquez sur "Deploy"

#### Option B: Via la CLI Vercel

```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Suivez les instructions et ajoutez vos variables d'environnement quand demandé
```

### 5. Configuration des variables d'environnement

Sur Vercel, allez dans :
- Project Settings → Environment Variables
- Ajoutez vos variables :
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### 6. Redéploiement automatique

Une fois configuré, chaque fois que vous poussez du code sur GitHub :
```bash
git add .
git commit -m "Description des changements"
git push
```

Vercel redéploiera automatiquement votre application ! 🚀

## Notes importantes

- ⚠️ **N'oubliez pas** de mettre à jour votre base de données Supabase avec le nouveau schéma
- 🔒 Les variables d'environnement ne sont jamais exposées publiquement
- 🌐 Vercel vous donnera une URL du type : `https://insightlpc.vercel.app`
- 📱 L'application sera automatiquement optimisée pour mobile et desktop

## Dépannage

Si le build échoue :
1. Vérifiez que toutes les dépendances sont dans `package.json`
2. Vérifiez que les variables d'environnement sont bien configurées
3. Consultez les logs de build sur Vercel
