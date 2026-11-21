// ============================================================================
// ARQON OS — Service Git réel
// Toutes les opérations sont exécutées via le binaire `git` du système.
// ============================================================================
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const execFileP = promisify(execFile);

function resolveRepo(input) {
  const base = path.resolve(os.homedir());
  const target = path.isAbsolute(input) ? path.resolve(input) : path.resolve(base, input);
  return target;
}

async function git(dir, args) {
  const { stdout, stderr } = await execFileP("git", args, {
    cwd: dir,
    maxBuffer: 8 * 1024 * 1024,
    timeout: 20000,
  });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

export async function getGitStatus(input) {
  const dir = resolveRepo(input);
  const isRepo = fs.existsSync(path.join(dir, ".git"));
  if (!isRepo) {
    return { path: dir, isRepo: false, branch: "", ahead: 0, behind: 0, clean: false, changes: [], remotes: [] };
  }

  let branch = "";
  try { branch = (await git(dir, ["rev-parse", "--abbrev-ref", "HEAD"])).stdout; } catch { /* detached */ }

  let ahead = 0, behind = 0;
  try {
    const up = (await git(dir, ["rev-list", "--left-right", "--count", "HEAD...@{upstream}"])).stdout;
    const [a, b] = up.split("\t").map(Number);
    ahead = a; behind = b;
  } catch { /* pas de remote */ }

  const changes = [];
  const status = await git(dir, ["status", "--porcelain=v1", "--untracked-files=all"]);
  for (const line of status.stdout.split("\n")) {
    if (!line.trim()) continue;
    const x = line[0], y = line[1];
    const file = line.slice(3);
    let st = "modified";
    if (x === "?" && y === "?") st = "untracked";
    else if (x === "M" || y === "M") st = "modified";
    else if (x === "A" || y === "A") st = "added";
    else if (x === "D" || y === "D") st = "deleted";
    else if (x === "R" || y === "R") st = "renamed";
    else if (x === "U" || y === "U") st = "conflicted";
    changes.push({ status: st, file });
  }

  let remotes = [];
  try { remotes = (await git(dir, ["remote"])).stdout.split("\n").filter(Boolean); } catch { /* ignore */ }

  return {
    path: dir,
    isRepo: true,
    branch,
    ahead,
    behind,
    clean: changes.length === 0,
    changes,
    remotes,
  };
}

export async function gitExec(dir, args) {
  // Exécute une commande git validée (liste de sous-commandes autorisées).
  const ALLOWED = ["status", "diff", "log", "branch", "fetch", "pull", "push", "add", "commit", "stash", "remote", "config"];
  const cmd = args[0];
  if (!ALLOWED.includes(cmd)) throw new Error(`Commande Git non autorisée : ${cmd}`);
  const resolved = resolveRepo(dir);
  return git(resolved, args);
}

export async function listRepos() {
  const home = os.homedir();
  const out = [];
  async function walk(dir, depth) {
    if (depth > 4) return;
    if (fs.existsSync(path.join(dir, ".git"))) {
      let branch = "";
      try { branch = (await git(dir, ["rev-parse", "--abbrev-ref", "HEAD"])).stdout; } catch { /* */ }
      out.push({ path: dir, name: path.basename(dir), branch });
      return;
    }
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules") {
        await walk(path.join(dir, e.name), depth + 1);
      }
    }
  }
  await walk(home, 0);
  return out;
}
