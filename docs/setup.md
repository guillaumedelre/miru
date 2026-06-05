# Setup

## Prérequis

- Node.js 24+
- Un compte [Firebase][firebase-console] (gratuit)
- Une clé API [TMDB][tmdb-api] (gratuite)

## Installation

```bash
git clone https://github.com/guillaumedelre/miru.git
cd miru
npm install
cp .env.example .env
```

## Variables d'environnement

Remplis le fichier `.env` :

```
VITE_TMDB_API_KEY=          # clé API TMDB (v3)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Obtenir la clé TMDB

1. Crée un compte sur [themoviedb.org][tmdb]
2. Paramètres → API → Demander une clé API (v3)
3. Copie la clé dans `VITE_TMDB_API_KEY`

### Configurer Firebase

1. Crée un projet sur la [console Firebase][firebase-console]
2. Active **Authentication** → méthode de connexion **Google**
3. Crée une **base de données Firestore** (région `eur3`)
4. Configure les règles Firestore :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

5. Paramètres du projet → Tes applications → ajoute une app Web
6. Copie les valeurs du bloc `firebaseConfig` dans le `.env`

## Docker (optionnel)

Un `compose.yaml` est fourni pour lancer l'environnement de développement dans un conteneur sans installer Node localement.

```bash
docker compose up
```

L'app est accessible sur `http://localhost:5173`. Le code source est monté en volume — le hot reload fonctionne comme en local.

> Le fichier `.env` est requis avant de lancer Docker (même contenu que pour le développement local).

## Commandes

```bash
npm run dev               # serveur de développement (http://localhost:5173)
npm run build             # build de production (TypeScript + Vite)
npm run build:extension   # build de l'extension navigateur → extension/dist/
npm run lint              # ESLint
npm run preview           # prévisualisation du build de production
```

### Builder l'extension pour la production

Avant de lancer `npm run build:extension` en production, ajoute dans `.env` :

```
VITE_MIRU_URL=https://ton-url.vercel.app
```

Sans cette variable, l'extension pointe sur `http://localhost:5173` (utile pour les tests locaux).

Voir [docs/extension.md](extension.md) pour l'installation dans Chrome et Firefox.

`localhost` est autorisé par défaut dans la console Firebase — aucune configuration supplémentaire n'est nécessaire pour développer en local.

[firebase-console]: https://console.firebase.google.com
[tmdb]: https://www.themoviedb.org
[tmdb-api]: https://developer.themoviedb.org/docs/getting-started
