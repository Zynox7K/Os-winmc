// ============================================================================
// ARQON OS — Détection réelle des projets
// Inspecte le vrai système de fichiers pour identifier les projets, leur langage,
// leur gestionnaire de paquets et leur statut Git.
// ============================================================================
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const MARKERS = [
  { file: "package.json", language: "Node.js / JavaScript", pm: "npm" },
  { file: "tsconfig.json", language: "TypeScript", pm: "npm" },
  { file: "Cargo.toml", language: "Rust", pm: "cargo" },
  { file: "pyproject.toml", language: "Python", pm: "pip" },
  { file: "requirements.txt", language: "Python", pm: "pip" },
  { file: "go.mod", language: "Go", pm: "go" },
  { file: "pom.xml", language: "Java (Maven)", pm: "maven" },
  { file: "build.gradle", language: "Java (Gradle)", pm: "gradle" },
  { file: "composer.json", language: "PHP", pm: "composer" },
  { file: "Gemfile", language: "Ruby", pm: "bundler" },
  { file: "CMakeLists.txt", language: "C / C++", pm: "cmake" },
  { file: "Makefile", language: "C / C++", pm: "make" },
];

async function isGitRepo(dir) {
  try {
    await fsp.access(path.join(dir, ".git"));
    return true;
  } catch {
    return false;
  }
}

async function detectLang(dir) {
  for (const m of MARKERS) {
    try {
      if (fs.existsSync(path.join(dir, m.file))) return { language: m.language, detectedBy: m.file, packageManager: m.pm };
    } catch { /* ignore */ }
  }
  // Regarder les sources dominantes.
  const exts = { ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".jsx": "JavaScript", ".py": "Python", ".rs": "Rust", ".go": "Go", ".java": "Java", ".c": "C", ".cpp": "C++", ".rb": "Ruby", ".php": "PHP" };
  const counts = {};
  try {
    for (const e of await fsp.readdir(dir, { withFileTypes: true })) {
      if (!e.isFile()) continue;
      const ext = path.extname(e.name);
      if (exts[ext]) counts[exts[ext]] = (counts[exts[ext]] || 0) + 1;
    }
  } catch { /* ignore */ }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (top) return { language: top[0], detectedBy: "extension dominante", packageManager: undefined };
  return { language: "Autre", detectedBy: "—", packageManager: undefined };
}

export async function scanProjects(root) {
  const scanRoot = root || os.homedir();
  const out = [];
  async function walk(dir, depth) {
    if (depth > 3) return;
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const isProject = MARKERS.some((m) => entries.some((e) => e.name === m.file)) ||
      (await isGitRepo(dir));
    if (isProject) {
      const det = await detectLang(dir);
      out.push({
        path: dir,
        name: path.basename(dir),
        language: det.language,
        detectedBy: det.detectedBy,
        packageManager: det.packageManager,
        isGitRepo: await isGitRepo(dir),
        hasNodeModules: fs.existsSync(path.join(dir, "node_modules")),
      });
      // On ne descend pas plus dans un projet déjà identifié.
      return;
    }
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules") {
        await walk(path.join(dir, e.name), depth + 1);
      }
    }
  }
  await walk(scanRoot, 0);
  return out;
}

export async function getProjectAt(dir) {
  const det = await detectLang(dir);
  return {
    path: dir,
    name: path.basename(dir),
    language: det.language,
    detectedBy: det.detectedBy,
    packageManager: det.packageManager,
    isGitRepo: await isGitRepo(dir),
    hasNodeModules: fs.existsSync(path.join(dir, "node_modules")),
  };
}
