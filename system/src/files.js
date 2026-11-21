// ============================================================================
// ARQON OS — Service fichiers réels
// Accès au vrai système de fichiers. Validation des chemins (pas d'interpolation
// de commandes). Le roots autorisés peuvent être configurés.
// ============================================================================
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// Racines accessibles. Par défaut : le home utilisateur + le workspace + le tmp.
const DEFAULT_ROOTS = [os.homedir(), process.cwd(), os.tmpdir()];
let roots = [...DEFAULT_ROOTS];

export function setRoots(r) {
  if (Array.isArray(r) && r.length) roots = r.map((x) => path.resolve(x));
}

export function resolveSafe(input) {
  // Accepte un chemin absolu ou relatif (par rapport au home).
  const base = path.resolve(os.homedir());
  const target = path.isAbsolute(input) ? path.resolve(input) : path.resolve(base, input);
  // Vérifie qu'il reste dans une racine autorisée.
  const ok = roots.some((r) => target === r || target.startsWith(r + path.sep));
  if (!ok) {
    const err = new Error("Accès refusé : le chemin n'est pas dans un espace autorisé ARQON.");
    err.code = "EACCES";
    throw err;
  }
  return target;
}

export async function listDir(inputPath) {
  const target = resolveSafe(inputPath || os.homedir());
  const entries = await fsp.readdir(target, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (e.name.startsWith(".") && e.name !== ".git") {
      // on cache les dotfiles sauf .git pour la lisibilité (optionnel)
    }
    let sizeBytes = 0;
    let modifiedMs = 0;
    try {
      const st = await fsp.stat(path.join(target, e.name));
      sizeBytes = st.size;
      modifiedMs = st.mtimeMs;
    } catch { /* ignoré */ }
    out.push({
      name: e.name,
      path: path.join(target, e.name),
      type: e.isDirectory() ? "directory" : "file",
      sizeBytes,
      modifiedMs,
    });
  }
  out.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "directory" ? -1 : 1));
  return out;
}

export async function readFile(inputPath) {
  const target = resolveSafe(inputPath);
  const content = await fsp.readFile(target, "utf8");
  return { path: target, content };
}

export async function writeFile(inputPath, content) {
  if (typeof content !== "string") throw new Error("Contenu invalide.");
  const target = resolveSafe(inputPath);
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.writeFile(target, content, "utf8");
  return { path: target, bytes: Buffer.byteLength(content) };
}

export async function mkdir(inputPath) {
  const target = resolveSafe(inputPath);
  await fsp.mkdir(target, { recursive: true });
  return { path: target };
}

export async function deletePath(inputPath) {
  const target = resolveSafe(inputPath);
  await fsp.rm(target, { recursive: true, force: true });
  return { path: target };
}

export async function getFsRoots() {
  return roots;
}

export function isFileExists(inputPath) {
  try { return fs.existsSync(resolveSafe(inputPath)); } catch { return false; }
}
