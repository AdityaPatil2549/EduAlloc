# EduAllocPro 🏫
### School Intelligence & Teacher Deployment Platform
**Build with AI Hackathon 2026 — Hack2Skill | Nandurbar District, Maharashtra**

---

## Overview

EduAllocPro uses real UDISE+ school data to compute **Deprivation Index (DI)** scores, match teachers to schools via **Vertex AI Embeddings**, run district-wide **OR-Tools CP-SAT optimization**, and generate **Gemini 1.5 Pro briefings** for education officers — all with English ↔ Marathi i18n.

## Architecture

```
Frontend (React 18 + Vite + Tailwind) → FastAPI Backend → Google Cloud
  └─ Dashboard (Google Maps)              └─ DI Pipeline      └─ BigQuery
  └─ Deploy (DVS Meter)                   └─ Matching         └─ Vertex AI
  └─ Briefing (Gemini JSON)               └─ Retention        └─ Gemini 1.5 Pro
  └─ EN ↔ MR toggle                       └─ OR-Tools         └─ Maps API
```

## Quick Start

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Copy and fill in env vars
copy .env.example .env

# Run dev server
uvicorn api.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
copy .env.example .env  # fill in VITE_MAPS_API_KEY

npm install
npm run dev
# → http://localhost:5173
```

## Environment Setup

| Variable | Where to get it |
|---|---|
| `GOOGLE_CLOUD_PROJECT` | GCP Console → project selector |
| `GOOGLE_API_KEY` | aistudio.google.com → Get API Key |
| `MAPS_API_KEY` | Cloud Console → APIs & Services → Credentials |
| `FIREBASE_PROJECT_ID` | Firebase Console → Project Settings |

## Data Pipeline
```bash
# 1. Create BigQuery dataset
bq mk --dataset --location=us-central1 YOUR_PROJECT:edualloc_dataset

# 2. Create tables
bq query --use_legacy_sql=false < backend/data/schema/create_tables.sql

# 3. Ingest Nandurbar schools
GOOGLE_CLOUD_PROJECT=your-project python -m data.ingest_udise

# 4. Generate + ingest synthetic teachers
GOOGLE_CLOUD_PROJECT=your-project python -m data.gen_teachers
```

## Running Tests
```bash
cd backend
pytest tests/ -v
# Target: all tests pass in < 30 seconds
```

## DVS Formula
```
DVS = (DI/100) × 0.40 + (match/100) × 0.35 + (retention/100) × 0.25
```
- **DI weight 0.40** — equity (most deprived schools get priority)
- **Match weight 0.35** — efficiency (best subject fit via Vertex AI)
- **Retention weight 0.25** — sustainability (teacher stays long-term)

## Deployment

**Backend → Cloud Run:**
```bash
gcloud run deploy edualloc-api \
  --source ./backend \
  --min-instances 1 \
  --memory 2Gi \
  --timeout 120 \
  --concurrency 10
```

**Frontend → Vercel:**
```bash
cd frontend && vercel --prod
```

## Phase 1 Checklist
- [ ] UDISE Nandurbar CSV loaded in BigQuery `schools` table
- [ ] DI scores computed for all Nandurbar schools
- [ ] 300 synthetic teacher profiles in BigQuery `teachers` table
- [ ] `/api/schools?district_id=NDB01` returns schools sorted by DI
- [ ] `/api/deploy/matches` returns 5 teachers with DVS scores
- [ ] `/api/deploy/optimize` returns optimized assignments
- [ ] `/api/briefing` returns valid JSON with `marathi_summary` field
- [ ] React dashboard shows school heatmap on Google Maps
- [ ] English ↔ Marathi language toggle works
- [ ] Download deployment order PDF works

---
*EduAllocPro · Build with AI Hackathon 2026 · Hack2Skill*
