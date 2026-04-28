<#
.SYNOPSIS
Full EduAllocPro production deployment — Backend (Cloud Run) + Frontend (Firebase Hosting).

.DESCRIPTION
Step 1: Deploys the FastAPI backend to Google Cloud Run (asia-south1).
Step 2: Builds the Vite frontend with production env, then deploys to Firebase Hosting.

.PREREQUISITES
- gcloud CLI authenticated: gcloud auth login
- firebase CLI installed: npm install -g firebase-tools
- firebase authenticated: firebase login
- Docker Desktop running (needed for gcloud run deploy --source)
#>

$ErrorActionPreference = "Stop"

# ── Config ──────────────────────────────────────────────────────────────────────
$PROJECT_ID   = "edualloc"
$REGION       = "asia-south1"
$SERVICE_NAME = "edualloc-api"

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  EduAllocPro — Full Production Deploy" -ForegroundColor Cyan
Write-Host "  Project: $PROJECT_ID - Region: $REGION" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Backend → Cloud Run ─────────────────────────────────────────────────
Write-Host "[1/4] Setting GCP project..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

Write-Host ""
Write-Host "[2/4] Deploying backend to Cloud Run (may take 3-5 min)..." -ForegroundColor Yellow

$deployArgs = @(
    "run", "deploy", $SERVICE_NAME,
    "--source", ".",
    "--region", $REGION,
    "--allow-unauthenticated",
    "--cpu", "1",
    "--memory", "1Gi",
    "--max-instances", "5",
    "--min-instances", "0",
    "--concurrency", "80",
    "--set-env-vars", "PORT=8080"
)

Push-Location "backend"
& gcloud @deployArgs
$backendExit = $LASTEXITCODE
Pop-Location

if ($backendExit -ne 0) {
    Write-Host "" 
    Write-Host "❌ Backend deployment failed. Check errors above." -ForegroundColor Red
    exit 1
}

# Get the deployed Cloud Run URL
Write-Host ""
Write-Host "[2/4] ✅ Backend deployed. Fetching Cloud Run URL..." -ForegroundColor Green
$CLOUD_RUN_URL = & gcloud run services describe $SERVICE_NAME --region $REGION --format "value(status.url)"

Write-Host "    URL: $CLOUD_RUN_URL" -ForegroundColor Cyan

# ── Step 3: Update frontend .env.production with real Cloud Run URL ───────────────
Write-Host ""
Write-Host "[3/4] Updating frontend production API URL..." -ForegroundColor Yellow

$envProdPath = "frontend\.env.production"
$envContent  = Get-Content $envProdPath -Raw
$envContent  = $envContent -replace "VITE_API_URL=.*", "VITE_API_URL=$CLOUD_RUN_URL"
Set-Content $envProdPath $envContent

Write-Host "    VITE_API_URL set to: $CLOUD_RUN_URL" -ForegroundColor Cyan

# ── Step 4: Frontend → Firebase Hosting ──────────────────────────────────────────
Write-Host ""
Write-Host "[4/4] Building frontend and deploying to Firebase Hosting..." -ForegroundColor Yellow

Push-Location "frontend"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed." -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

firebase deploy --only hosting

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=========================================================" -ForegroundColor Green
    Write-Host "  ✅ FULL DEPLOYMENT COMPLETE!" -ForegroundColor Green
    Write-Host "  Backend:  $CLOUD_RUN_URL" -ForegroundColor Cyan
    Write-Host "  Frontend: https://edualloc.web.app" -ForegroundColor Cyan
    Write-Host "=========================================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Firebase Hosting deploy failed. Run 'firebase login' and retry." -ForegroundColor Red
    exit 1
}
