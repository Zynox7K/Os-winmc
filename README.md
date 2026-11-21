# ARQON OS

> **Build. Code. Create.**

ARQON OS est un **Developer Operating System** : un environnement de travail
complètement fonctionnel réunissant dans un seul système tout ce dont un
développeur a besoin — terminal réel, éditeur de code, gestion de projets,
paquets, environnements de développement, conteneurs, surveillance système et
gestion Git.

Ce dépôt contient la **couche logicielle réelle** d'ARQON : un backend système
(Node.js) et un environnement de bureau (React + TypeScript). **Aucune
fonctionnalité système n'est simulée** : toutes les données proviennent du
système hôte réel.

---

## Architecture

```
arqon-os/
├── system/      # Backend système (Node.js + Express + WebSocket)
│   └── src/
│       ├── server.js        # Serveur REST + PTY
│       ├── pty/pty_bridge.py # VRAI pseudo-terminal (module pty Python)
│       ├── stats.js         # Stats CPU/RAM/disque/réseau réelles
│       ├── files.js         # Gestion de fichiers réelle (validation sécurité)
│       ├── projects.js      # Détection réelle de projets
│       ├── packages.js      # APT/Flatpak/pip/npm réels
│       ├── git.js           # Git réel (binaire git)
│       ├── devtools.js      # Détection des langages réels
│       └── containers.js    # Docker/Podman réels
├── desktop/     # Environnement de bureau (React + TypeScript + Vite)
│   └── src/
│       ├── App.tsx          # Shell (fenêtres, bureaux virtuels)
│       ├── shell/           # TopBar, Dock, Launcher, ControlCenter, widgets
│       ├── apps/            # Terminal, Code, Projects, Packages, DevTools, Containers, Monitor, Git
│       └── shared/          # Design system, composants
├── shared/      # Types d'API + design tokens (palette ARQON)
├── installer/   # Scripts de build et de lancement
├── documentation/
└── tests/
```

### Stack

| Couche | Technologie |
|--------|-------------|
| Système | Node.js, Express, WebSocket, **PTY Python (vrai pseudo-terminal)** |
| Desktop | React 18, TypeScript, Vite, xterm.js, lucide-react |
| Design | CSS variables ARQON, dark mode, glassmorphism discret |

---

## Démarrage rapide

### Prérequis
- Node.js ≥ 18
- Python 3 (module `pty`, standard)
- (facultatif) Docker/Podman, Git, les langages de développement

### Mode développement

```bash
./installer/dev.sh
```

Démarre le backend (`http://localhost:8787`) et le desktop
(`http://localhost:5173`). Le desktop proxye `/api` et `/ws` vers le backend.

### Mode production (bundle)

```bash
./installer/build.sh
```

Génère le bundle desktop dans `desktop/dist/`.

---

## Applications natives ARQON

| Application | Fonctionnalité réelle |
|-------------|------------------------|
| **ARQON Terminal** | PTY système réel : onglets, sessions, recherche, thèmes. Les commandes s'exécutent dans un vrai shell (bash/zsh). |
| **ARQON Code** | Éditeur qui lit/écrit les vrais fichiers du système, coloration syntaxique, explorateur. |
| **ARQON Projects** | Détection réelle des projets, langages, dépendances, statut Git. |
| **ARQON Packages** | Liste réelle des paquets installés (APT/dpkg, Flatpak, pip, npm). |
| **ARQON DevTools** | Détection réelle des langages (Node, Python, Rust, Go, Java, C/C++, …) et versions. |
| **ARQON Containers** | Gestion réelle via Docker/Podman (démarrage, arrêt, images). |
| **ARQON Monitor** | Stats système en temps réel (CPU/RAM/disque/réseau/processus) + graphiques SVG. |
| **ARQON Git** | Statut, branches, commits, pull/push via le binaire Git réel. |

## Environnement de bureau

- **Barre supérieure** : marque ARQON, recherche universelle, bureaux virtuels, statut, notifications.
- **Dock** : lancement rapide, indicateurs de fenêtres ouvertes, pagination bureaux.
- **Launcher** : recherche universelle (applications, fichiers, projets, commandes, outils).
- **Centre de Contrôle** : apparence, réseau, audio, écrans, clavier, comptes, confidentialité, sécurité, mises à jour, stockage, performances.
- **Widgets** : horloge et stats système sur le bureau.
- **Bureaux virtuels** : 3 bureaux avec gestion de fenêtres (drag, redimensionnement, minimisation, maximisation).

## Design system ARQON

Palette sombre par défaut (voir `shared/design/tokens.css`) :

```
Background #090D16 · Surface #182235 · Accent #328BFF · Accent2 #765BFF
Text #F5F7FC · Muted #8B96AA · Success #25C98A · Warning #F5B942 · Error #F05D6C
```

## Sécurité

- **Moindre privilège** : aucune commande privilégiée lancée automatiquement.
- **Validation des chemins** : accès fichier limité aux espaces autorisés (home, workspace, tmp).
- **Validation des entrées** : exécution de paquets/commandes filtrée (caractères interdits).
- **Git sécurisé** : liste de sous-commandes autorisées.
- **Journalisation** des opérations sensibles.
- **Secrets** : clés SSH gérées par le shell du PTY, jamais exposées.

## Tests

```bash
npm test          # backend + desktop
```

- **Backend** : stats système, fichiers (read/write/validation), détection de projets.
- **Desktop** : contrat du design system (palette ARQON).

## API système (extrait)

| Route | Description |
|-------|-------------|
| `GET /api/system/info` | Infos OS réelles |
| `GET /api/system/stats` | CPU/RAM/disque/réseau réels |
| `GET /api/system/processes` | Processus réels (/proc) |
| `WS /ws/terminal` | PTY terminal réel |
| `GET /api/files/list?path=` | Liste réelle d'un dossier |
| `POST /api/files` | Écriture réelle d'un fichier |
| `GET /api/projects` | Détection réelle des projets |
| `GET /api/packages` | Paquets installés réels |
| `GET /api/git/status?path=` | Statut Git réel |
| `GET /api/devtools` | Outils de dev réels |
| `GET /api/containers` | Conteneurs réels (Docker/Podman) |

## Documentation

- `documentation/ARCHITECTURE.md` — décisions techniques et structure.

---

**ARQON OS — Build. Code. Create.**
