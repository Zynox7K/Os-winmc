# ARQON OS — Documentation d'Architecture

## 1. Vue d'ensemble

ARQON OS est un **Developer Operating System** : une distribution Linux personnalisée
orientée développeurs. Dans ce dépôt, nous construisons la **couche logicielle**
d'ARQON : le shell de bureau, les applications natives, et les services système
qui les font fonctionner.

ARQON est organisé en deux parties réelles et fonctionnelles :

| Couche | Localisation | Technologie | Rôle |
|--------|--------------|-------------|------|
| **Système** (backend) | `system/` | Node.js + Express + WebSocket | Services système réels : PTY terminal, stats CPU/RAM/disque/réseau, gestion de fichiers/projets, gestion de paquets, Git, outils de dev |
| **Desktop** (frontend) | `desktop/` | React + TypeScript + Vite | Environnement de bureau ARQON : shell, dock, launcher, centre de contrôle, applications natives |
| **Shared** | `shared/` | TypeScript | Types communs, design tokens, schémas d'API |

## 2. Décisions techniques

### 2.1 Système de fichiers & structure
Monorepo npm workspaces. `system/` et `desktop/` sont deux paquets autonomes
dépendants de `shared/`. Le backend est indépendant du frontend : toute l'API est
documentée dans `shared/types/api.ts`.

### 2.2 Backend (`system/`)
- **Node.js + Express** pour l'API REST.
- **WebSocket (ws)** pour le terminal PTY et le flux de stats système en temps réel.
- **node-pty** pour un **vrai pseudo-terminal** : les commandes s'exécutent dans un
  PTY système (bash/zsh), avec historique réel, tab-completion, TUIs. Aucune
  simulation.
- **child_process / os / fs** pour les stats système réelles et la gestion de
  fichiers. Aucune donnée fictive en production.

### 2.3 Frontend (`desktop/`)
- **React 18 + TypeScript + Vite**.
- **Design system ARQON** : CSS variables (`shared/design/tokens.css`) + composants
  réutilisables (`desktop/src/shared/components/`). Mode sombre par défaut,
  glassmorphism discret, palette ARQON.
- **xterm.js** pour l'émulation terminal côté client, connectée au PTY backend.
- **lucide-react** pour les icônes cohérentes.
- Charts système dessinés nativement en SVG (graphiques fluides, sans dépendance lourde).

### 2.4 Sécurité
- Principle of least privilege : le backend ne lance aucune commande privilégiée
  sans contrôle. Le terminal expose une liste de commandes interdites configurable.
- Validation des entrées sur toutes les routes de fichiers (transmission en
  objets JSON, jamais de commandes interpolées).
- Les clés SSH ne sont jamais exposées ; on utilise `ssh-agent`/le passthrough
  par le shell du PTY, pas de lecture directe.
- Journalisation des opérations sensibles.

## 3. Structure du dépôt

```
arqon-os/
├── system/            # backend système (Node.js)
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/
│   │   ├── pty/
│   │   ├── stats/
│   │   └── ...
│   └── package.json
├── desktop/           # environnement de bureau (React)
│   ├── src/
│   │   ├── shell/
│   │   ├── apps/
│   │   ├── shared/
│   │   └── main.tsx
│   └── package.json
├── shared/            # types + design tokens communs
│   ├── types/
│   └── design/
├── installer/         # scripts d'installation du système
├── distribution/      # mécanismes de build (documentés)
├── documentation/
├── tests/
└── scripts/
```

## 4. API système (résumé)

Toutes les routes sont préfixées par `/api`. Voir `shared/types/api.ts` pour le
contrat complet.

- `GET  /api/system/info` — infos OS réelles
- `GET  /api/system/stats` — stats CPU/RAM/disque/réseau réelles
- `GET  /api/system/processes` — liste des processus réels
- `WS   /ws/terminal` — PTY terminal (messages : init, data, exit, resize)
- `GET  /api/files?path=` — lecture d'un vrai fichier
- `GET  /api/files/list?path=` — liste réelle d'un dossier
- `POST /api/files` — écriture d'un vrai fichier
- `GET  /api/projects` — détection réelle des projets
- `GET  /api/packages` — paquets installés (via apt/dpkg réel) + Flatpak
- `GET  /api/git/status?path=` — statut Git réel
- `GET  /api/devtools` — détection des langages/outils réels

## 5. Plan de développement

- **Phase 1 — Architecture** ✅ (ce document)
- **Phase 2 — Interface** : design system, shell, dock, launcher, control center
- **Phase 3 — Applications** : Terminal, Projects, Packages, DevTools, Monitor, Git, Code
- **Phase 4 — Intégration système** : services, permissions, notifications, settings
- **Phase 5 — Distribution** : scripts de build, installateur, mise à jour
- **Phase 6 — Tests** : tests unitaires + intégration, corrections
