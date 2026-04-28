# EduAlloc 🏫

### School Intelligence & Teacher Deployment Platform

> **Google Solution Challenge 2026 · Build with AI Hackathon · Hack2Skill**
> *District Focus: Nandurbar, Maharashtra, India*

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%201.0-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Google Cloud](https://img.shields.io/badge/Cloud-Google%20Cloud-4285F4?style=flat-square&logo=googlecloud)](https://cloud.google.com/)
[![Firebase](https://img.shields.io/badge/Auth-Firebase-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![BigQuery](https://img.shields.io/badge/Data-BigQuery-4285F4?style=flat-square&logo=googlebigquery)](https://cloud.google.com/bigquery)

---

## 📌 Overview

EduAllocPro is an AI-powered intelligence platform that solves one of Maharashtra's most critical education challenges — **the inequitable distribution of teachers across tribal and rural schools**.

Using real **UDISE+ school data** for Nandurbar district, EduAllocPro:

- Computes **Deprivation Index (DI)** scores to identify under-resourced schools
- Matches teachers to schools via **Vertex AI text embeddings** (768-dim semantic matching)
- Runs district-wide **OR-Tools CP-SAT optimization** to maximize equity at scale
- Generates **Gemini 1.5 Pro intelligence briefings** for Block Education Officers (BEOs)
- Delivers all insights through a **"Mission Control" dark intelligence dashboard** with English ↔ Marathi i18n

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EduAllocPro Platform                          │
├──────────────────────────┬──────────────────────────────────────────┤
│      Frontend (React 18) │           Backend (FastAPI)              │
│  ─────────────────────── │  ──────────────────────────────────────  │
│  Dashboard (Leaflet Map) │  DI Pipeline    → BigQuery               │
│  Deploy (DVS Queue)      │  Matching       → Vertex AI Embeddings   │
│  Briefing (Gemini AI)    │  Retention      → Scoring Engine         │
│  Analytics (Recharts)    │  OR-Tools       → CP-SAT Optimizer       │
│  BEO Dashboard           │  Gemini 1.5 Pro → Briefing & PDF         │
│  EN ↔ MR i18n            │  Firebase       → Auth                   │
└──────────────────────────┴──────────────────────────────────────────┘
                           ↕
              Google Cloud (BigQuery · Vertex AI · Maps · Gemini)
```

---

## ✨ Key Features

### 🧠 Four AI Pipelines

| Pipeline                      | Description                                                                      | Technology                        |
| ----------------------------- | -------------------------------------------------------------------------------- | --------------------------------- |
| **Deprivation Index**   | Scores schools 0–100 based on remoteness, infrastructure, and teacher shortage  | BigQuery SQL + Python             |
| **Teacher Matching**    | Embeds teacher profiles and school needs; ranks by cosine similarity             | Vertex AI `textembedding-gecko` |
| **Retention Scoring**   | Predicts teacher retention likelihood based on distance, background, and history | Custom scoring engine             |
| **CP-SAT Optimization** | Solves district-wide teacher-to-school assignment to maximize aggregate DVS      | Google OR-Tools                   |

### 📊 DVS Formula (Deployment Value Score)

```
DVS = (DI/100) × 0.40  +  (Match/100) × 0.35  +  (Retention/100) × 0.25
         ↑ equity              ↑ efficiency              ↑ sustainability
```

### 🗺️ Mission Control Dashboard

- **Interactive Leaflet heatmap** — color-coded school markers by DI severity (Critical / High / Stable)
- **Priority school queue** — filterable list with real-time DI scores
- **School detail panel** — slide-in inspector with full school metadata
- **Split-view deployment screen** — vacancy queue + AI-ranked teacher match cards with DVS meters
- **Gemini briefing screen** — document-style intelligence reports with Marathi summaries
- **District analytics** — Recharts-powered district-level dashboards
- **BEO Dashboard** — dedicated Block Education Officer view

### 🌐 Internationalization

Full **English ↔ Marathi** toggle via `react-i18next` with auto-detected browser language.

---

## 🗂️ Project Structure

```
edualloc-pro/
├── backend/
│   ├── ai/
│   │   ├── deprivation.py       # DI score computation
│   │   ├── matching.py          # Vertex AI embedding-based teacher matching
│   │   ├── optimizer.py         # OR-Tools CP-SAT district optimizer
│   │   ├── retention.py         # Teacher retention scoring
│   │   ├── gemini.py            # Gemini 1.5 Pro briefing generation
│   │   └── embeddings_cache.py  # In-memory TTL cache (max 10k embeddings)
│   ├── api/
│   │   ├── main.py              # FastAPI app factory with lifespan context
│   │   └── routes/
│   │       ├── schools.py       # GET /api/schools
│   │       ├── teachers.py      # GET /api/teachers
│   │       ├── deploy.py        # POST /api/deploy/matches & /optimize
│   │       ├── briefing.py      # GET /api/briefing
│   │       └── health.py        # GET /api/health
│   ├── data/
│   │   ├── ingest_udise.py      # Ingests Nandurbar UDISE+ CSV → BigQuery
│   │   ├── gen_teachers.py      # Generates 300 synthetic teacher profiles
│   │   └── geocode.py           # Batch geocodes schools via Google Maps API
│   ├── models/                  # Pydantic v2 schemas (School, Teacher, Error)
│   ├── services/                # BigQuery, Vertex AI, Gemini, Maps clients
│   ├── tests/                   # pytest integration + unit tests
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx         # Map-centric district heatmap
│   │   │   ├── Deploy.jsx            # Teacher deployment workflow
│   │   │   ├── Briefing.jsx          # Gemini AI briefings
│   │   │   ├── DistrictAnalytics.jsx # Analytics charts
│   │   │   ├── DeploymentMap.jsx     # Deployment visualization map
│   │   │   ├── BEODashboard.jsx      # Block Education Officer view
│   │   │   └── Login.jsx             # Firebase auth
│   │   ├── components/               # SchoolCard, TeacherMatchCard, DIBadge, etc.
│   │   ├── hooks/                    # useSchools, useAnalytics, useDeployment
│   │   ├── lib/                      # di-colors.js, map-markers.js utilities
│   │   ├── i18n/                     # en.json / mr.json translation files
│   │   └── App.jsx                   # Router + Dark Intelligence layout
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── deploy_all.ps1               # One-command full deployment script
├── docker-compose.yml
├── firebase.json
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- A **Google Cloud project** with the following APIs enabled:
  - BigQuery API
  - Vertex AI API
  - Generative Language API (Gemini)
  - Maps JavaScript API
  - Geocoding API
- **Firebase project** (for authentication)

---

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env
# → Edit .env with your credentials (see Environment Variables section)

# Run development server
uvicorn api.main:app --reload --port 8000
# API docs: http://localhost:8000/docs
```

---

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
copy .env.example .env
# → Fill in VITE_MAPS_API_KEY and other variables

# Start dev server
npm run dev
# → http://localhost:5173
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable                 | Description              | Where to Get                                                   |
| ------------------------ | ------------------------ | -------------------------------------------------------------- |
| `GOOGLE_CLOUD_PROJECT` | GCP project ID           | GCP Console → Project selector                                |
| `GOOGLE_API_KEY`       | Gemini API key           | [aistudio.google.com](https://aistudio.google.com) → Get API Key |
| `BQ_DATASET`           | BigQuery dataset name    | Default:`edualloc_dataset`                                   |
| `BQ_LOCATION`          | BigQuery region          | Default:`us-central1`                                        |
| `VERTEX_AI_LOCATION`   | Vertex AI region         | Default:`us-central1`                                        |
| `GEMINI_MODEL`         | Gemini model version     | Default:`gemini-1.5-pro-latest`                              |
| `CORS_ORIGINS`         | Allowed frontend origins | `http://localhost:5173` (dev)                                |
| `APP_ENV`              | Environment flag         | `development` or `production`                              |
| `WORKERS`              | Uvicorn worker count     | `1` (required — in-memory cache)                            |

### Frontend (`frontend/.env`)

| Variable                     | Description                                              |
| ---------------------------- | -------------------------------------------------------- |
| `VITE_API_BASE_URL`        | Backend API base URL (e.g.`http://localhost:8000`)     |
| `VITE_MAPS_API_KEY`        | Google Maps JavaScript API key                           |
| `VITE_MAPS_DEFAULT_LAT`    | Default map center latitude (`21.3661` for Nandurbar)  |
| `VITE_MAPS_DEFAULT_LNG`    | Default map center longitude (`74.2167` for Nandurbar) |
| `VITE_MAPS_DEFAULT_ZOOM`   | Default map zoom level (recommended:`9`)               |
| `VITE_DEFAULT_DISTRICT_ID` | Default district identifier (`NDB01`)                  |
| `VITE_FIREBASE_*`          | Firebase project credentials                             |

---

## 🗄️ Data Pipeline

```bash
# 1. Create BigQuery dataset
bq mk --dataset --location=us-central1 YOUR_PROJECT:edualloc_dataset

# 2. Create schema tables
bq query --use_legacy_sql=false < backend/data/schema/create_tables.sql

# 3. Ingest Nandurbar UDISE+ school data
GOOGLE_CLOUD_PROJECT=your-project python -m data.ingest_udise

# 4. Generate and ingest 300 synthetic teacher profiles
GOOGLE_CLOUD_PROJECT=your-project python -m data.gen_teachers

# 5. Geocode schools (batch enrichment with lat/lng)
GOOGLE_CLOUD_PROJECT=your-project python -m data.geocode
```

> **Free-tier note:** A `mock_geocode.py` is included that assigns deterministic coordinates to all Nandurbar schools without requiring a billing-enabled Maps API key. The 80km deployment constraint remains fully functional.

---

## 🧪 Running Tests

```bash
cd backend
pytest tests/ -v
# Target: all tests pass in < 30 seconds with mocked BigQuery/Firebase clients
```

---

## 📡 API Reference

| Method   | Endpoint                 | Description                                                       |
| -------- | ------------------------ | ----------------------------------------------------------------- |
| `GET`  | `/api/health`          | Service health check                                              |
| `GET`  | `/api/schools`         | List schools sorted by DI score (`?district_id=NDB01&limit=50`) |
| `GET`  | `/api/teachers`        | List teacher profiles                                             |
| `POST` | `/api/deploy/matches`  | Get top-5 AI-ranked teacher matches for a school                  |
| `POST` | `/api/deploy/optimize` | Run CP-SAT district-wide optimizer                                |
| `GET`  | `/api/briefing`        | Generate Gemini 1.5 Pro district briefing with Marathi summary    |

Interactive API docs available at: `http://localhost:8000/docs`

---

## 🚢 Deployment

### One-command deployment (PowerShell)

```powershell
.\deploy_all.ps1
```

This script builds the frontend, deploys the backend to Cloud Run, and pushes the frontend to Firebase Hosting.

### Manual: Backend → Cloud Run

```bash
gcloud run deploy edualloc-api \
  --source ./backend \
  --region us-central1 \
  --min-instances 1 \
  --memory 2Gi \
  --timeout 120 \
  --concurrency 10 \
  --set-env-vars GOOGLE_CLOUD_PROJECT=your-project
```

### Manual: Frontend → Firebase Hosting

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

---

## 🧩 Tech Stack

| Layer                        | Technology                            |
| ---------------------------- | ------------------------------------- |
| **Frontend Framework** | React 18 + Vite 5                     |
| **Styling**            | Tailwind CSS v4                       |
| **Map**                | Leaflet + react-leaflet               |
| **Charts**             | Recharts                              |
| **Animations**         | Framer Motion                         |
| **i18n**               | react-i18next (EN + MR)               |
| **Auth**               | Firebase Authentication               |
| **Backend Framework**  | FastAPI 0.111 + Uvicorn               |
| **Validation**         | Pydantic v2                           |
| **Logging**            | structlog (JSON structured logs)      |
| **Data Warehouse**     | Google Cloud BigQuery                 |
| **AI Embeddings**      | Vertex AI `textembedding-gecko`     |
| **Generative AI**      | Gemini 1.5 Pro                        |
| **Optimization**       | Google OR-Tools (CP-SAT)              |
| **PDF Generation**     | ReportLab                             |
| **Geocoding**          | Google Maps Geocoding API + geopy     |
| **Routing Distance**   | OpenRouteService API                  |
| **Testing**            | pytest + pytest-asyncio + pytest-mock |
| **Containerization**   | Docker + docker-compose               |

---

## 🏁 Hackathon Checklist

- [X] UDISE+ Nandurbar school data loaded in BigQuery `schools` table
- [X] DI scores computed for all schools
- [X] 300 synthetic teacher profiles in BigQuery `teachers` table
- [X] `/api/schools?district_id=NDB01` returns schools sorted by DI
- [X] `/api/deploy/matches` returns teachers ranked by DVS score
- [X] `/api/deploy/optimize` returns optimized district-wide assignments (60 slots / 30 schools in ~0.5s)
- [X] `/api/briefing` returns JSON with `marathi_summary` field
- [X] Vertex AI mock fallback for free-tier (deterministic pseudo-embeddings)
- [X] React dashboard shows school heatmap on interactive map
- [X] English ↔ Marathi language toggle
- [X] Dark "Mission Control" intelligence UI
- [ ] PDF deployment order download (in progress)
- [ ] Full Cloud Run + Firebase Hosting production deployment

---

## 🤝 Contributing

This is a hackathon project. The codebase follows strict guidelines documented in the root-level design documents (`EduAllocPro_*_v1.0.docx`).

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

*EduAllocPro · Google Solution Challenge 2026 · Build with AI Hackathon · Hack2Skill*
*Built with ❤️ for the children of Nandurbar*
