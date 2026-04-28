<#
.SYNOPSIS
Deploys the EduAllocPro backend to Google Cloud Run.

.DESCRIPTION
This script builds the Docker container and deploys it to Cloud Run in the asia-south1 region.
It assumes you have already authenticated using `gcloud auth login`.
#>

$ErrorActionPreference = "Stop"

# Configuration
$PROJECT_ID = "edu-alloc"
$REGION = "asia-south1"
$SERVICE_NAME = "edualloc-api"

# Check if .env file exists and parse the keys
$ENV_VARS = ""
if (Test-Path ".env") {
    Write-Host "Found .env file, preparing environment variables for deployment..." -ForegroundColor Cyan
    $lines = Get-Content ".env"
    $validVars = @()
    foreach ($line in $lines) {
        if (!([string]::IsNullOrWhiteSpace($line)) -and !($line.StartsWith("#"))) {
            $validVars += $line.Trim()
        }
    }
    $ENV_VARS = $validVars -join ","
} else {
    Write-Host "Warning: No .env file found. Deploying without environment variables." -ForegroundColor Yellow
}

Write-Host "==================================================" -ForegroundColor Green
Write-Host "🚀 Deploying EduAllocPro Backend to Google Cloud Run" -ForegroundColor Green
Write-Host "Project: $PROJECT_ID" -ForegroundColor Cyan
Write-Host "Region:  $REGION" -ForegroundColor Cyan
Write-Host "Service: $SERVICE_NAME" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Green

# 1. Set the project
Write-Host "`n[1/3] Setting GCP Project..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

# 2. Build and Deploy
Write-Host "`n[2/3] Building and deploying container (this may take a few minutes)..." -ForegroundColor Yellow

$deployArgs = @(
    "run", "deploy", $SERVICE_NAME,
    "--source", ".",
    "--region", $REGION,
    "--allow-unauthenticated",
    "--cpu", "1",
    "--memory", "1Gi",
    "--max-instances", "5",
    "--concurrency", "80" # Allows many requests to share the same embeddings cache
)

if (!([string]::IsNullOrEmpty($ENV_VARS))) {
    $deployArgs += "--set-env-vars"
    $deployArgs += $ENV_VARS
}

# Run the deploy command
& gcloud @deployArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[3/3] ✅ Deployment Successful!" -ForegroundColor Green
    Write-Host "Note: To update variables securely later, use Google Secret Manager instead of .env vars." -ForegroundColor Gray
} else {
    Write-Host "`n❌ Deployment failed. Please check the logs above." -ForegroundColor Red
}
