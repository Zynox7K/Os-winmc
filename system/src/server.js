// ============================================================================
// ARQON OS — Serveur système
// Express (REST) + WebSocket (PTY terminal + flux stats).
// Toutes les données sont réelles (pas de simulation).
// ============================================================================
import express from "express";
import http from "node:http";
import { WebSocketServer } from "ws";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

import * as stats from "./stats.js";
import * as files from "./files.js";
import * as projects from "./projects.js";
import * as packages from "./packages.js";
import * as git from "./git.js";
import * as devtools from "./devtools.js";
import * as containers from "./containers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8787;

const app = express();
app.use(express.json({ limit: "5mb" }));

// --- CORS (permet le preview ARQON) ---
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Journalisation des opérations sensibles.
function logOp(msg) {
  console.log(`[arqon] ${new Date().toISOString()} ${msg}`);
}

// ---------------------------------------------------------------------------
// Routes système
// ---------------------------------------------------------------------------
app.get("/api/system/info", async (_req, res) => {
  try { res.json(await stats.getSystemInfo()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/system/stats", async (_req, res) => {
  try { res.json(await stats.getStats()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/system/processes", async (_req, res) => {
  try { res.json(await stats.getProcesses()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/system/network", async (_req, res) => {
  try { res.json(await stats.getNetworkInterfaces()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/system/roots", (_req, res) => {
  res.json({ roots: files.getFsRoots() });
});

// ---------------------------------------------------------------------------
// Routes fichiers
// ---------------------------------------------------------------------------
app.get("/api/files/list", async (req, res) => {
  try { res.json(await files.listDir(req.query.path || os.homedir())); }
  catch (e) { res.status(403).json({ error: e.message }); }
});

app.get("/api/files", async (req, res) => {
  try { res.json(await files.readFile(req.query.path)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.post("/api/files", async (req, res) => {
  try {
    const { path: p, content } = req.body;
    if (!p) return res.status(400).json({ error: "Champ 'path' requis." });
    logOp(`écriture fichier : ${p}`);
    res.json(await files.writeFile(p, content || ""));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post("/api/files/mkdir", async (req, res) => {
  try { res.json(await files.mkdir(req.body.path)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.post("/api/files/delete", async (req, res) => {
  try {
    logOp(`suppression : ${req.body.path}`);
    res.json(await files.deletePath(req.body.path));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ---------------------------------------------------------------------------
// Routes projets
// ---------------------------------------------------------------------------
app.get("/api/projects", async (req, res) => {
  try { res.json(await projects.scanProjects(req.query.root)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/projects/at", async (req, res) => {
  try { res.json(await projects.getProjectAt(req.query.path)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// ---------------------------------------------------------------------------
// Routes paquets
// ---------------------------------------------------------------------------
app.get("/api/packages", async (_req, res) => {
  try { res.json(await packages.getInstalledPackages()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/packages/updates", async (_req, res) => {
  try { res.json(await packages.getUpdateCount()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/packages/install", async (req, res) => {
  try {
    const { name, source } = req.body;
    logOp(`installation paquet : ${name} (${source})`);
    res.json(await packages.installPackage(name, source));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ---------------------------------------------------------------------------
// Routes Git
// ---------------------------------------------------------------------------
app.get("/api/git/status", async (req, res) => {
  try { res.json(await git.getGitStatus(req.query.path)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/git/exec", async (req, res) => {
  try {
    const { path: p, args } = req.body;
    logOp(`git ${args?.join(" ")}`);
    res.json(await git.gitExec(p, args));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get("/api/git/repos", async (_req, res) => {
  try { res.json(await git.listRepos()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------------------------------------------------------------------------
// Routes devtools
// ---------------------------------------------------------------------------
app.get("/api/devtools", async (_req, res) => {
  try { res.json(await devtools.getDevTools()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------------------------------------------------------------------------
// Routes conteneurs
// ---------------------------------------------------------------------------
app.get("/api/containers", async (_req, res) => {
  try { res.json(await containers.getContainers()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/containers/images", async (_req, res) => {
  try { res.json(await containers.listImages()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/containers/action", async (req, res) => {
  try {
    const { action, name } = req.body;
    logOp(`conteneurs : ${action} ${name}`);
    res.json(await containers.containerAction(action, name));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
app.get("/api/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ---------------------------------------------------------------------------
// WebSocket — PTY terminal + stats
// ---------------------------------------------------------------------------
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/terminal" });

const PTY_PY = path.join(__dirname, "pty", "pty_bridge.py");

wss.on("connection", (ws) => {
  let ptyProcess = null;
  let started = false;

  function send(obj) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
  }

  function spawnPty(cfg) {
    ptyProcess = spawn("python3", [PTY_PY, JSON.stringify(cfg)], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, TERM: "xterm-256color", SHELL: cfg.shell || "/bin/bash" },
    });

    // Python -> Node (stdout, framing par longueur)
    let buf = Buffer.alloc(0);
    ptyProcess.stdout.on("data", (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= 8) {
        const length = buf.readBigUInt64BE(0);
        if (buf.length < 8 + Number(length)) break;
        const body = buf.subarray(8, 8 + Number(length)).toString("utf8");
        buf = buf.subarray(8 + Number(length));
        try {
          const msg = JSON.parse(body);
          if (msg.op === "data") {
            send({ type: "data", data: Buffer.from(msg.data, "base64").toString("latin1") });
          } else if (msg.op === "exit") {
            send({ type: "exit", code: msg.code });
            started = false;
          } else if (msg.op === "error") {
            send({ type: "error", message: msg.message });
          }
        } catch { /* ignore parse */ }
      }
    });

    ptyProcess.stderr.on("data", (d) => {
      // Les erreurs du bridge sont remontées en data pour ne pas casser le terminal.
      send({ type: "data", data: d.toString("utf8") });
    });

    ptyProcess.on("exit", () => {
      if (started) send({ type: "exit", code: -1 });
    });
  }

  // Encadre les messages vers le pont Python (8 octets longueur big-endian + JSON).
  function sendToPty(obj) {
    if (!ptyProcess || ptyProcess.stdin.destroyed) return;
    const body = Buffer.from(JSON.stringify(obj), "utf8");
    const header = Buffer.alloc(8);
    header.writeBigUInt64BE(BigInt(body.length));
    ptyProcess.stdin.write(Buffer.concat([header, body]));
  }

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === "init") {
      if (ptyProcess) { try { ptyProcess.kill(); } catch { /* */ } }
      const shell = msg.shell || process.env.SHELL || "/bin/bash";
      spawnPty({
        shell,
        cwd: msg.cwd || os.homedir(),
        cols: msg.cols || 120,
        rows: msg.rows || 30,
      });
      started = true;
      return;
    }
    if (!ptyProcess) return;

    if (msg.type === "data") {
      sendToPty({ op: "write", data: Buffer.from(msg.data, "latin1").toString("base64") });
    } else if (msg.type === "resize") {
      sendToPty({ op: "resize", cols: msg.cols, rows: msg.rows });
    } else if (msg.type === "signal") {
      sendToPty({ op: "signal", sig: msg.sig });
    }
  });

  ws.on("close", () => {
    if (ptyProcess) { try { ptyProcess.kill(); } catch { /* */ } }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  logOp(`ARQON OS système démarré sur http://0.0.0.0:${PORT}`);
});

// ---------------------------------------------------------------------------
// Gestion statique du bundle desktop (mode production tout-en-un)
// Si desktop/dist existe, le backend sert l'UI + l'API + le PTY sur une seule
// service (idéal pour Render / déploiement simple).
// ---------------------------------------------------------------------------
const DESKTOP_DIST = path.resolve(__dirname, "../../desktop/dist");
try {
  if (fs.existsSync(DESKTOP_DIST)) {
    app.use(express.static(DESKTOP_DIST));
    // Fallback SPA : toute route non API renvoie index.html.
    app.get(/^(?!\/api|\/ws).*/, (_req, res) => {
      res.sendFile(path.join(DESKTOP_DIST, "index.html"));
    });
    logOp(`bundle desktop statique servi depuis ${DESKTOP_DIST}`);
  } else {
    logOp("bundle desktop/dist absent — seul l'API + PTY sont servis (mode dev)");
  }
} catch (e) {
  logOp(`erreur static serving : ${e.message}`);
}

export { app, server };
