# ARQON OS — Installation et Distribution

Ce document décrit comment construire, installer et distribuer ARQON OS.

## 1. Prérequis système

| Composant | Version minimale | Recommandé |
|-----------|-------------------|------------|
| Node.js | 18 | 20+ |
| npm | 9 | 10+ |
| Python 3 | 3.8 | 3.11+ (module `pty`, standard) |
| Compilateur C/C++ | — | nécessaire pour certains outils de dev |
| Docker ou Podman | — | pour la gestion de conteneurs |
| Git | 2.30+ | pour ARQON Git |

ARQON OS s'exécute sur une base Linux (Ubuntu LTS recommandée). Le backend
utilise les APIs système réelles (`/proc`, `statfs`, `os`, `child_process`).

## 2. Construction

### Développement

```bash
./installer/dev.sh
```

Lance simultanément :
- le **backend système** sur `http://localhost:8787`
- le **desktop** sur `http://localhost:5173` (proxy `/api` et `/ws` → backend)

### Bundle de production

```bash
./installer/build.sh
```

Produit le bundle statique dans `desktop/dist/` (HTML + CSS + JS minifiés).

## 3. Structure de la distribution

```
arqon-os/
├── system/          # services système (Node.js)
├── desktop/dist/    # bundle desktop statique
├── shared/          # types + design tokens
├── installer/       # scripts
└── documentation/
```

## 4. Déploiement

### Mode backend + desktop

1. Installer les dépendances : `npm install`
2. Lancer le backend : `npm run start --workspace system`
3. Servir le bundle desktop (exemple avec un serveur statique) :
   `npx serve desktop/dist`
4. Configurer le proxy `/api` et `/ws` vers le backend.

### Mode tout-in-un (backend seul)

Le backend peut servir le bundle desktop statique en production (en ajoutant une
route Express statique pointant vers `desktop/dist`), afin d'avoir une seule
processus.

## 5. Mise à jour du système

ARQON s'appuie sur les gestionnaires réels :
- **APT** pour les paquets système
- **Flatpak** pour les applications
- **pip/npm** pour les outils de développement

Le Centre de Contrôle → « Mises à jour » affiche le nombre de mises à jour APT
disponibles (interrogé via `apt-get -s upgrade`).

## 6. Procédure de récupération

- Les journaux des opérations sensibles sont enregistrés par le backend
  (préfixe `[arqon]`).
- Le terminal PTY garde l'historique réel du shell dans le scrollback.
- Les fichiers sont gérés via le service `files.js` avec validation de chemin.

## 7. Test pré-installation (machine virtuelle)

Avant toute installation physique :
1. Lancer `./installer/dev.sh` dans une VM.
2. Vérifier le terminal PTY, les stats système, la détection des projets.
3. Vérifier l'installation d'un paquet via ARQON Packages.
4. Vérifier un `pull`/`push` Git via ARQON Git.

> **Ne jamais écraser un disque ou modifier le système hôte sans consentement
> explicite.** ARQON ne modifie pas le disque de l'hôte ; elle exécute les
> commandes dans l'environnement où elle est lancée.
