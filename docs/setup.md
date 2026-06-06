# Setup

## Prerequisites

- Node.js 24+
- A [Firebase][firebase-console] account (free)
- A [TMDB][tmdb-api] API key (free)

## Installation

```bash
git clone https://github.com/guillaumedelre/miru.git
cd miru
npm install
cp .env.example .env
```

## Environment variables

Fill in the `.env` file:

```
VITE_TMDB_API_KEY=          # TMDB API key (v3)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Getting the TMDB key

1. Create an account on [themoviedb.org][tmdb]
2. Settings → API → Request an API key (v3)
3. Copy the key into `VITE_TMDB_API_KEY`

### Configuring Firebase

1. Create a project in the [Firebase console][firebase-console]
2. Enable **Authentication** → sign-in method **Google**
3. Create a **Firestore database** (region `eur3`)
4. Configure Firestore rules:

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

5. Project settings → Your apps → add a Web app
6. Copy the values from the `firebaseConfig` block into `.env`

## Docker (optional)

A `compose.yaml` is included to run the development environment in a container without installing Node locally.

```bash
docker compose up
```

The app is available at `http://localhost:5173`. The source code is mounted as a volume — hot reload works just like locally.

> The `.env` file is required before starting Docker (same content as for local development).

## Commands

```bash
npm run dev               # development server (http://localhost:5173)
npm run build             # production build (TypeScript + Vite)
npm run build:extension   # browser extension build → extension/dist/
npm run lint              # ESLint
npm run preview           # preview the production build
```

### Building the extension for production

Before running `npm run build:extension` in production, add to `.env`:

```
VITE_MIRU_URL=https://your-url.vercel.app
```

Without this variable, the extension points to `http://localhost:5173` (useful for local testing).

See [docs/extension.md](extension.md) for installation in Chrome and Firefox.

`localhost` is allowed by default in the Firebase console — no additional configuration is needed for local development.

[firebase-console]: https://console.firebase.google.com
[tmdb]: https://www.themoviedb.org
[tmdb-api]: https://developer.themoviedb.org/docs/getting-started
