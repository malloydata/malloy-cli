#!/usr/bin/env bash
set -euxo pipefail

nix-shell --pure --keep NPM_TOKEN --command "$(cat <<NIXCMD
  set -euxo pipefail
  export PGHOST=127.0.0.1
  export PGDATABASE=postgres
  export PGUSER=private-cloudbuild@malloy-303216.iam
  cd /workspace
  git branch -m main
  npm --no-audit --no-fund ci --loglevel error
  npm run lint && npm run build && npm run test-silent-ci
  echo Publishing malloy-cli
  PRERELEASE=\$(date +%y%m%d%H%M%S)

  echo Version: \$VERSION
  npm publish --access=public --tag next
NIXCMD
)"