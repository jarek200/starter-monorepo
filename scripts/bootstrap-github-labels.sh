#!/usr/bin/env bash
# Create or update GitHub PR labels used by .github/workflows/deploy.yml
#
# Usage:
#   ./scripts/bootstrap-github-labels.sh owner/repo
#
# Requires: GitHub CLI (gh) authenticated with repo scope

set -euo pipefail

REPO="${1:-${GITHUB_REPOSITORY:-}}"

if [ -z "$REPO" ]; then
  echo "Usage: ./scripts/bootstrap-github-labels.sh owner/repo"
  exit 1
fi

upsert_label() {
  local name="$1"
  local color="$2"
  local description="$3"

  if gh label create "$name" --color "$color" --description "$description" --repo "$REPO" 2>/dev/null; then
    echo "Created label: $name"
  else
    gh label edit "$name" --color "$color" --description "$description" --repo "$REPO"
    echo "Updated label: $name"
  fi
}

upsert_label "deploy:int" "0075ca" "Trigger int deployment"
upsert_label "deploy:stage" "e4e669" "Trigger stage deployment"
upsert_label "deploy:prod" "d93f0b" "Trigger prod deployment"
upsert_label "deploy-failed:int" "d73a4a" "Deploy to int failed"
upsert_label "deploy-failed:stage" "d73a4a" "Deploy to stage failed"
upsert_label "deploy-failed:prod" "d73a4a" "Deploy to prod failed"

echo "Done. Labels are ready for $REPO"
