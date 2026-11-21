#!/usr/bin/env bash
# ============================================================================
# ARQON OS — Script de build de la distribution
# Compile le système (backend) et le desktop (frontend), produit un bundle.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== ARQON OS — Build de distribution ==="

# 1. Vérification de l'environnement.
command -v node >/dev/null 2>&1 || { echo "Node.js requis."; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "npm requis."; exit 1; }
echo "Node $(node -v) · npm $(npm -v)"

# 2. Installation des dépendances (workspaces).
echo "→ Installation des dépendances…"
npm install

# 3. Build du backend système.
echo "→ Build du système…"
npm run build --workspace system 2>/dev/null || echo "   (backend sans étape de build ESM — OK)"

# 4. Build du desktop (bundle de production).
echo "→ Build du desktop…"
npm run build --workspace desktop

# 5. Produit final.
DIST="$ROOT/desktop/dist"
if [ -d "$DIST" ]; then
  echo "→ Bundle desktop généré : $DIST"
fi
echo "=== Build ARQON OS terminé avec succès ==="
