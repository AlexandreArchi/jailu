# JAILU — Ma Bibliothèque

Application de suivi de lectures (lu, en cours, à lire) — PWA mobile-first.
Projet d'apprentissage GCP.

## Stack technique

- **Frontend** : React 19 + Vite 6 + TypeScript strict + Tailwind CSS v4 + Firebase Auth
- **Backend** : FastAPI (Python 3.11) déployé sur Cloud Run
- **Base de données** : Firestore Native mode (`europe-west1`)
- **Hébergement** : Firebase Hosting (frontend) + Cloud Run (backend)
- **CI/CD** : GitHub Actions + Workload Identity Federation (pas de clé JSON)

## Prérequis locaux

- Node.js 24+
- Python 3.11+
- Docker Desktop
- Google Cloud SDK (`gcloud`)
- Firebase CLI (`npm install -g firebase-tools`)
- Compte GCP avec projet `jailu-prod` configuré (voir section Déploiement)

## Installation locale

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Remplir .env.local avec les valeurs Firebase (Project Settings > Your apps > Web app)
npm install
npm run dev
# → http://localhost:5173
```

### Backend

```bash
cd backend
cp .env.example .env
# Remplir .env (GCP_PROJECT_ID au minimum)
python -m venv .venv
source .venv/Scripts/activate   # Windows bash
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger, dev uniquement)
```

## Commandes de développement

| Commande | Répertoire | Description |
|----------|------------|-------------|
| `npm run dev` | `frontend/` | Serveur Vite avec HMR |
| `npm run build` | `frontend/` | Build de production |
| `npm run preview` | `frontend/` | Prévisualiser le build (PWA active) |
| `npm run typecheck` | `frontend/` | Vérification TypeScript sans compilation |
| `uvicorn app.main:app --reload` | `backend/` | Backend en mode rechargement auto |
| `pytest` | `backend/` | Tests Python |
| `docker build -t jailu-api .` | `backend/` | Build image Docker locale |
| `docker run --rm -p 8080:8080 --env-file .env jailu-api` | `backend/` | Test Docker en local |

## Déploiement

### Pré-requis GCP (à faire une seule fois)

Voir `infra/setup-wif.sh` pour les commandes gcloud complètes.

Ressources à créer manuellement :
1. Projet GCP `jailu-prod` + projet Firebase associé
2. Activer les APIs : Cloud Run, Artifact Registry, Secret Manager, IAM
3. Créer le dépôt Artifact Registry `jailu-backend` dans `europe-west1`
4. Créer les service accounts `jailu-cloudrun-sa` et `jailu-github-sa`
5. Configurer Workload Identity Federation (pool `github-pool`, provider `github-provider`)
6. Configurer les secrets GitHub (voir section Secrets GitHub ci-dessous)

### Secrets GitHub Actions

À configurer dans Settings > Secrets and variables > Actions :

| Secret | Description |
|--------|-------------|
| `GCP_PROJECT_ID` | `jailu-prod` |
| `WIF_PROVIDER` | Output de `setup-wif.sh` |
| `WIF_SERVICE_ACCOUNT` | `jailu-github-sa@jailu-prod.iam.gserviceaccount.com` |
| `FIREBASE_SERVICE_ACCOUNT` | JSON du compte de service Firebase |
| `VITE_FIREBASE_API_KEY` | Depuis Firebase Console |
| `VITE_FIREBASE_AUTH_DOMAIN` | Depuis Firebase Console |
| `VITE_FIREBASE_PROJECT_ID` | `jailu-prod` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Depuis Firebase Console |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Depuis Firebase Console |
| `VITE_FIREBASE_APP_ID` | Depuis Firebase Console |
| `VITE_API_BASE_URL_PROD` | URL Cloud Run (après premier déploiement backend) |

### Firestore Rules

```bash
cd infra && firebase deploy --only firestore:rules
```

### Déploiement manuel Firebase Hosting

```bash
cd frontend && npm run build
cd ../infra && firebase deploy --only hosting
```

### Déploiement automatique (CI/CD)

Sur chaque push vers `main` :
- Si `frontend/**` est modifié → workflow `frontend.yml` se déclenche
- Si `backend/**` est modifié → workflow `backend.yml` se déclenche

## Structure du projet

```
JAILU/
├── .github/workflows/
│   ├── frontend.yml      # CI/CD frontend : build + Firebase Hosting
│   └── backend.yml       # CI/CD backend : Docker + Artifact Registry + Cloud Run
├── frontend/             # React 19 + Vite 6 + TypeScript + Tailwind + PWA
│   ├── src/
│   │   ├── lib/          # Initialisation Firebase
│   │   └── pages/        # LoginPage, LibraryPage
│   └── public/icons/     # Icônes PWA 192x192 et 512x512
├── backend/              # FastAPI Python 3.11
│   ├── app/
│   │   ├── main.py       # Routes et middleware
│   │   ├── config.py     # Settings via pydantic-settings
│   │   └── logging_config.py
│   └── Dockerfile        # Multi-stage, image python:3.11-slim
└── infra/                # Configuration Firebase et GCP
    ├── firebase.json
    ├── firestore.rules
    └── setup-wif.sh      # Script de configuration WIF
```

## Estimation des coûts GCP (usage perso)

| Service | Free tier | Usage estimé |
|---------|-----------|--------------|
| Cloud Run | 2M req/mois, 360 000 vCPU-s | Largement dans le free tier |
| Firestore | 1 Go stockage, 50 000 lectures/jour | Dans le free tier |
| Firebase Hosting | 10 Go stockage, 360 Mo/jour | Dans le free tier |
| Artifact Registry | 0,5 Go/mois gratuit | 1-2 images = ~200 Mo |
| Secret Manager | 6 versions actives/mois gratuites | Dans le free tier |

Coût estimé en usage perso : **0 EUR/mois** (free tier suffisant).
