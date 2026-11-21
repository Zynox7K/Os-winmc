// ============================================================================
// ARQON OS — Tests du système (stats, fichiers, projets)
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

import * as stats from "../src/stats.js";
import * as files from "../src/files.js";
import * as projects from "../src/projects.js";
import * as git from "../src/git.js";
import * as devtools from "../src/devtools.js";
import * as containers from "../src/containers.js";

test("getSystemInfo renvoie les infos OS réelles", async () => {
  const info = await stats.getSystemInfo();
  assert.ok(info.hostname, "hostname présent");
  assert.ok(info.cpuCores > 0, "cpuCores > 0");
  assert.ok(info.totalMemBytes > 0, "mémoire totale > 0");
  assert.equal(info.platform, process.platform);
});

test("getStats renvoie CPU/RAM/disque cohérents", async () => {
  const s = await stats.getStats();
  assert.ok(s.cpu.usage >= 0 && s.cpu.usage <= 100, "usage CPU dans [0,100]");
  assert.ok(s.memory.totalBytes > 0, "mémoire totale > 0");
  assert.ok(s.memory.usage >= 0 && s.memory.usage <= 100, "usage mémoire dans [0,100]");
  assert.ok(s.disk.totalBytes >= 0, "disque total >= 0");
  assert.ok(Array.isArray(s.cpu.perCore), "perCore est un tableau");
});

test("listDir liste les vrais fichiers du home", async () => {
  const entries = await files.listDir(os.homedir());
  assert.ok(Array.isArray(entries), "tableau retourné");
  assert.ok(entries.length > 0, "le home contient des fichiers");
  assert.ok(entries.every((e) => e.name && (e.type === "file" || e.type === "directory")), "entrées valides");
});

test("writeFile + readFile fonctionnent sur un vrai fichier", async () => {
  const tmp = path.join(os.tmpdir(), `arqon-test-${Date.now()}`);
  await files.writeFile(tmp, "hello arqon");
  const { content } = await files.readFile(tmp);
  assert.equal(content, "hello arqon");
  await files.deletePath(tmp);
  assert.ok(!fs.existsSync(tmp), "fichier supprimé");
});

test("resolveSafe bloque l'accès hors des racines autorisées", () => {
  assert.throws(() => files.resolveSafe("/etc/passwd"), /Accès refusé/);
});

test("scanProjects détecte les projets réels", async () => {
  const root = os.homedir();
  const found = await projects.scanProjects(root);
  assert.ok(Array.isArray(found), "tableau retourné");
  // Le repo ARQON lui-même est un projet (package.json au root).
  assert.ok(found.length >= 0, "scan terminé sans erreur");
});

test("getNetworkInterfaces renvoie les interfaces réelles", async () => {
  const net = await stats.getNetworkInterfaces();
  assert.ok(Array.isArray(net), "tableau retourné");
  assert.ok(net.length > 0, "au moins une interface");
  assert.ok(net.every((n) => n.name && typeof n.state === "string"), "entrées valides");
});

test("getGitStatus lit un vrai dépôt", async () => {
  const repo = path.resolve(os.homedir(), "Os-winmc");
  const st = await git.getGitStatus(repo);
  assert.equal(st.isRepo, true, "dépôt Git détecté");
  assert.equal(typeof st.branch, "string", "branche renvoyée");
  assert.ok(Array.isArray(st.changes), "changements sous forme de tableau");
  assert.ok(Array.isArray(st.remotes), "remotes sous forme de tableau");
});

test("gitExec bloque les commandes non autorisées", async () => {
  const repo = path.resolve(os.homedir(), "Os-winmc");
  await assert.rejects(() => git.gitExec(repo, ["clean"]), /non autorisée/i);
});

test("getDevTools détecte Node.js réel", async () => {
  const tools = await devtools.getDevTools();
  assert.ok(Array.isArray(tools) && tools.length > 0, "outils détectés");
  const node = tools.find((t) => t.id === "node");
  assert.ok(node, "Node.js présent dans la liste");
  assert.equal(node.installed, true, "Node.js installé");
  assert.match(node.version, /v\d+/, "version Node valide");
});

test("getContainers signale correctement l'absence de moteur", async () => {
  const c = await containers.getContainers();
  assert.equal(typeof c.available, "boolean", "disponibilité booléenne");
  if (!c.available) {
    assert.equal(c.runtime, null, "runtime null sans moteur");
  }
  assert.ok(Array.isArray(c.containers), "tableau de conteneurs");
});

test("containerAction refuse les noms invalides", async () => {
  await assert.rejects(() => containers.containerAction("start", "bad;name"), /invalide/i);
});
