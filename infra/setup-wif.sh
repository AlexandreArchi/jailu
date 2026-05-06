#!/usr/bin/env bash
# Script de configuration Workload Identity Federation pour GitHub Actions
# Exécuter une seule fois, depuis une machine avec gcloud authentifié sur jailu-prod

set -euo pipefail

PROJECT_ID="jailu-prod"
GITHUB_USERNAME="AlexandreArchi"
GITHUB_REPO="jailu"
SA_GITHUB="jailu-github-sa"
SA_CLOUDRUN="jailu-cloudrun-sa"

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")

echo "==> Création du Workload Identity Pool"
gcloud iam workload-identity-pools create "github-pool" \
  --location="global" \
  --display-name="GitHub Actions Pool" \
  --project="$PROJECT_ID"

echo "==> Création du Provider OIDC GitHub"
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub OIDC Provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == '${GITHUB_USERNAME}'" \
  --project="$PROJECT_ID"

echo "==> Liaison WIF -> Service Account GitHub Actions"
gcloud iam service-accounts add-iam-policy-binding \
  "${SA_GITHUB}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/${GITHUB_USERNAME}/${GITHUB_REPO}" \
  --project="$PROJECT_ID"

echo ""
echo "==> Valeur à copier dans le secret GitHub WIF_PROVIDER :"
gcloud iam workload-identity-pools providers describe github-provider \
  --location=global \
  --workload-identity-pool=github-pool \
  --format="value(name)" \
  --project="$PROJECT_ID"

echo ""
echo "==> Valeur à copier dans le secret GitHub WIF_SERVICE_ACCOUNT :"
echo "${SA_GITHUB}@${PROJECT_ID}.iam.gserviceaccount.com"
