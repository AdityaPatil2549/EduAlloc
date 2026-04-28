# EduAllocPro Project Memory

## Project Overview
EduAllocPro is an AI-driven teacher deployment and school intelligence platform designed for the Maharashtra Education Department. It optimizes teacher placement using the Deprivation Index (DI) and commute-constrained matching.

## Tech Stack
- **Frontend**: React 18, Vite, Leaflet.js (Maps), Framer Motion, Tailwind CSS.
- **Backend**: FastAPI (Python 3.11+), Uvicorn, Structlog.
- **Database**: Google BigQuery (Data Warehouse).
- **AI/ML**: 
    - **Vertex AI**: textembedding-gecko@003 for semantic matching.
    - **Gemini 3.1 Pro**: District briefings and PDF deployment orders.
    - **OR-Tools**: Constraint optimization for district-level teacher shuffling.
- **Maps**: OpenRouteService (Distance Matrix) & Nominatim (Geocoding) — *Successfully migrated from Google Maps to ensure free-tier compliance.*

## Key Migrations & Fixes
- **Maps API Migration**: 
    - Removed `@react-google-maps/api`.
    - Integrated `react-leaflet` with CartoDB Positron tiles (no API key needed).
    - Swapped Google Distance Matrix for OpenRouteService (ORS).
    - Swapped Google Geocoding for Nominatim (geopy) with rate-limiting.
- **Gemini Briefing**:
    - Finalized `/api/briefing` and `/api/briefing/order`.
    - Upgraded SDK to `google-genai`.
    - Configured model to `gemini-3.1-pro` based on user API key access.
    - Implemented PDF narrative generation via ReportLab with English fallback for official formatting.

## Current Environment State (Local)
- **Backend Port**: 8000
- **Frontend Port**: 5177
- **Active Model**: `gemini-3.1-pro`
- **Working Directory**: `e:/Google Solution Challange/Antigravity/edualloc-pro`

## Pending Items / Future Roadmap
- [ ] Implement actual `POST /api/deploy` to write assignment results back to BigQuery.
- [ ] Connect Real-time Teacher Retention (Phase 4) model to the dashboard.
- [ ] Marathi TrueType font integration for ReportLab PDF generation.
- [ ] Production deployment configuration for Cloud Run & Vercel.

## Session History (2026-04-26)
### 1. Gemini Intelligence Hardening
- **Model Upgrade**: Transitioned from `gemini-1.5-flash` to `gemini-3.1-pro` after verifying user API key capabilities.
- **Prompt Engineering**: Refined briefing prompts to include UDISE+ priority IDs and Marathi translations.
- **PDF Generation**: Resolved ReportLab font limitations by standardizing the formal order narrative in English while providing a web-link to the Marathi digital version.

### 2. Maps Migration Finalization
- **Backend**: Successfully verified the OpenRouteService (ORS) integration for distance matrix calculations.
- **Frontend**: Confirmed Leaflet map rendering with CartoDB Light tiles, resolving previous Google Maps API errors.

### 3. API Reliability
- Added a `test_ors.py` and `test_gemini.py` suite for rapid environment validation.
- Standardized environment variables in `.env` to clearly separate Routing (ORS) from Intelligence (Gemini) APIs.
