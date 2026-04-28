# EduAllocPro 🏫

### School Intelligence & Teacher Deployment Platform

> **Google Solution Challenge 2026 · Build with AI Hackathon · Hack2Skill**  
> *District Focus: Nandurbar, Maharashtra, India*

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel)](https://vercel.com/)
[![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=flat-square&logo=render)](https://render.com/)
[![Google Cloud](https://img.shields.io/badge/Cloud-Google%20Cloud-4285F4?style=flat-square&logo=googlecloud)](https://cloud.google.com/)
[![Firebase](https://img.shields.io/badge/Auth-Firebase-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com/)

---

## 📌 Overview

EduAllocPro is an AI-powered intelligence platform that solves one of Maharashtra's most critical education challenges — **the inequitable distribution of teachers across tribal and rural schools**.

Using real **UDISE+ school data** for Nandurbar district, EduAllocPro:

- Computes **Deprivation Index (DI)** scores to identify under-resourced schools.
- Matches teachers to schools via **Vertex AI semantic embeddings** (768-dim matching).
- Predicts **Retention Probability** to ensure sustainable deployments.
- Runs district-wide **OR-Tools CP-SAT optimization** to maximize equity across all schools.
- Generates **Gemini 1.5 Pro intelligence briefings** and bilingual (EN/MR) deployment orders.
- Delivers insights through a premium **"Mission Control"** dashboard with high-fidelity analytics.

---

## ✨ Key Features

### 📊 Intelligence Dashboards
- **Mission Control Heatmap**: Interactive Leaflet-powered geospatial view of all schools in Nandurbar, color-coded by deprivation severity.
- **District Analytics**: High-fidelity Recharts dashboards showing DI distribution, vacancy trends by block, and comparative infrastructure metrics.
- **BEO View**: A dedicated Block Education Officer panel for real-time monitoring of local school health and staffing status.

### 🧠 Four AI Pipelines
1. **Deprivation Index (DI)**: A weighted composite score (0–100) based on remoteness, ASER proxies, and infrastructure deficits.
2. **Teacher Matching (DVS)**: Semantic profile matching using **Vertex AI `textembedding-gecko`**.
3. **Retention Scoring**: Heuristic modeling to predict the sustainability of a teacher's placement.
4. **District Optimization**: Global assignment solver powered by **Google OR-Tools** to maximize district-wide equity.

### 🌐 Localization & Accessibility
- **Bilingual Support**: Instant toggle between English and Marathi.
- **PDF Generation**: Auto-generated deployment orders in Devanagari script.

---

## 🚀 Deployment Strategy (No Credit Card Required)

To avoid Google Cloud billing restrictions, we use a hybrid hosting strategy:

### 1. Frontend → Vercel
The React frontend is hosted on Vercel for maximum performance and a professional URL.
- **Root Directory**: `edualloc-pro/frontend`
- **Framework Preset**: `Vite`
- **Environment Variables**: All `VITE_` variables from `.env` must be added to Vercel Settings.

### 2. Backend → Render.com
The FastAPI backend is hosted on Render, which supports Docker/Python and allows for longer timeouts (crucial for AI optimization).
- **Service Type**: `Web Service`
- **Root Directory**: `edualloc-pro/backend`
- **Runtime**: `Python 3.12`
- **Environment Variables**: Requires `GOOGLE_API_KEY` (Gemini), `GOOGLE_CLOUD_PROJECT`, and `CORS_ORIGINS`.

---

## 🏗️ Technical Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 5, Tailwind CSS v4, Framer Motion |
| **Data Viz** | Leaflet (Maps), Recharts (Analytics) |
| **Backend** | FastAPI, Pydantic v2, Uvicorn |
| **Database** | Google Cloud BigQuery |
| **AI/ML** | Vertex AI (Embeddings), Gemini 1.5 Pro (Generative AI) |
| **Optimization** | Google OR-Tools (CP-SAT Solver) |
| **Auth** | Firebase Authentication |

---

## 🛠️ Local Development

### Backend Setup
```bash
cd edualloc-pro/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --reload
```

### Frontend Setup
```bash
cd edualloc-pro/frontend
npm install
npm run dev
```

---

## 🤝 Acknowledgments
Built for the **Google Solution Challenge 2026**. Special thanks to the children and educators of Nandurbar District, whose data and challenges inspired this platform.

*Built with ❤️ by the EduAlloc Team*
