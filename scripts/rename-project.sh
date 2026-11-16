#!/usr/bin/env bash
# Replace template placeholders with project-specific names.
#
# Usage:
#   ./scripts/rename-project.sh --scope mycompany [--app my-app] [--sso mycompany] [--dry-run]
#
# Replaces:
#   @sst-monorepo        → @<scope>
#   sst-monorepo-starter → <app>   (default: scope)
#   sst-monorepo/        → <app>/  (README tree)
#   acme                 → <sso>   (default: scope; package.json + README SSO examples only)
#
# Admin factory should call with the same flags after CreateRepo:
#   --scope "$githubOrg" --app "$slug" --sso "$githubOrg"
#
# After renaming, run: pnpm install && pnpm verify

set -euo pipefail

OLD_SCOPE='@sst-monorepo'
OLD_APP='sst-monorepo-starter'
OLD_TREE='sst-monorepo/'
OLD_SSO='acme'

SCOPE=''
APP=''
SSO=''
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: ./scripts/rename-project.sh --scope SCOPE [--app APP] [--sso SSO] [--dry-run]

  --scope   npm scope without @ (required), e.g. mycompany
  --app     SST / root package name (default: scope), e.g. my-app
  --sso     AWS SSO session placeholder (default: scope)
  --dry-run Print files that would change without editing

Run from the repository root. Updates pnpm-lock.yaml in place; run `pnpm install` afterward.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --scope)
      SCOPE="${2:-}"
      shift 2
      ;;
    --app)
      APP="${2:-}"
      shift 2
      ;;
    --sso)
      SSO="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$SCOPE" ]]; then
  echo "ERROR: --scope is required" >&2
  usage
  exit 1
fi

SCOPE="${SCOPE#@}"
SCOPE="$(printf '%s' "$SCOPE" | tr '[:upper:]' '[:lower:]')"

if [[ ! "$SCOPE" =~ ^[a-z0-9][a-z0-9._-]*$ ]]; then
  echo "ERROR: invalid scope '$SCOPE' (use a lowercase npm scope without @)" >&2
  exit 1
fi

APP="${APP:-$SCOPE}"
SSO="${SSO:-$SCOPE}"
NEW_SCOPE="@${SCOPE}"

if [[ ! "$APP" =~ ^[a-z0-9][a-z0-9._-]*$ ]]; then
  echo "ERROR: invalid app name '$APP'" >&2
  exit 1
fi

if [[ ! "$SSO" =~ ^[a-z0-9][a-z0-9._-]*$ ]]; then
  echo "ERROR: invalid sso session '$SSO'" >&2
  exit 1
fi

if ! command -v rg >/dev/null 2>&1; then
  echo "ERROR: ripgrep (rg) is required" >&2
  exit 1
fi

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

mapfile -t FILES < <(
  rg -l "${OLD_SCOPE}|${OLD_APP}|${OLD_TREE}|${OLD_SSO}" \
    --hidden \
    --glob '!.git/**' \
    --glob '!node_modules/**' \
    --glob '!.sst/**' \
    --glob '!dist/**' \
    --glob '!.turbo/**' \
    --glob '!scripts/rename-project.sh' \
    2>/dev/null || true
)

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "No template placeholders found — nothing to rename."
  exit 0
fi

apply_replacements() {
  local file="$1"
  local include_sso="$2"
  local tmp

  tmp="$(mktemp)"
  REPL_SCOPE="$NEW_SCOPE" REPL_APP="$APP" REPL_TREE="${APP}/" perl -pe '
    s/\Q@sst-monorepo\E/$ENV{REPL_SCOPE}/g;
    s/\Qsst-monorepo-starter\E/$ENV{REPL_APP}/g;
    s/\Qsst-monorepo\/\E/$ENV{REPL_TREE}/g;
  ' "$file" >"$tmp"

  if [[ "$include_sso" == "true" ]]; then
    REPL_SSO="$SSO" perl -pi -e 's/\Qacme\E/$ENV{REPL_SSO}/g' "$tmp"
  fi

  if ! cmp -s "$file" "$tmp"; then
    if [[ "$DRY_RUN" == true ]]; then
      echo "would update: $file"
    else
      mv "$tmp" "$file"
      echo "updated: $file"
    fi
  else
    rm -f "$tmp"
  fi
}

echo "Renaming template → scope=${NEW_SCOPE}, app=${APP}, sso=${SSO}"

for file in "${FILES[@]}"; do
  case "$file" in
    package.json | README.md)
      apply_replacements "$file" true
      ;;
    *)
      apply_replacements "$file" false
      ;;
  esac
done

if [[ "$DRY_RUN" == true ]]; then
  echo "Dry run complete. Re-run without --dry-run to apply."
else
  echo "Done. Run: pnpm install && pnpm verify"
fi
