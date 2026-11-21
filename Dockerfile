# ============================================================================
# ARQON OS — Dockerfile
# Image tout-en-un : Node.js (backend + desktop) + Python 3 (PTY terminal réel).
# Conçue pour Render (déploiement automatique) et tout autre hébergeur container.
# ============================================================================
FROM node:22-slim

# Python 3 est REQUIS : le pont PTY terminal (pty_bridge.py) utilise le module
# `pty` du standard Python. L'image Node par défaut n'en a pas.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 \
      git \
      && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Copie des manifests pour installer les dépendances (cache des couches).
COPY package.json package-lock.json* ./
COPY system/package.json ./system/
COPY desktop/package.json ./desktop/
COPY shared/package.json ./shared/

RUN npm install

# 2. Copie du code.
COPY system ./system
COPY desktop ./desktop
COPY shared ./shared
COPY installer ./installer

# 3. Build du bundle desktop (production).
RUN npm run build --workspace desktop

# 4. Le backend sert l'API + le PTY + le bundle statique sur une seule service.
EXPOSE 8787

ENV NODE_ENV=production
ENV PORT=8787

# Le backend expose l'UI (desktop/dist), l'API (/api) et le PTY (/ws/terminal).
CMD ["node", "system/src/server.js"]
