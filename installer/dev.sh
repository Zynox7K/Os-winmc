#!/usr/bin/env bash
# ============================================================================
# ARQON OS — Lancement du développement
# Démarre le backend système (port 8787) et le desktop (port 5173).
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -d node_modules ]; then
  echo "→ Installation des dépendances…"
  npm install
fi

echo "=== ARQON OS — Développement ==="
echo "Backend  : http://localhost:8787  (API + PTY)"
echo "Desktop  : http://localhost:5173  (environnement de bureau)"
echo "Arrêt : Ctrl+C"
echo

cleanup() {
  echo
  echo "→ Arrêt des services ARQON…"
  [ -n "${SYS_PID:-}" ] && kill "$SYS_PID" 2>/dev/null || true
  [ -n "${DESK_PID:-}" ] && kill "$DESK_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Backend système
node system/src/server.js &
SYS_PID=$!

# Desktop (Vite proxies /api et /ws vers le backend)
npm run dev --workspace desktop &
DESK_PID=$!

wait -n "$SYS_PID" "$DESK_PID"
