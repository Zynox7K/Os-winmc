// ============================================================================
// ARQON OS — Service conteneurs réels
// S'appuie sur Docker ou Podman (le binaire réel du système).
// ============================================================================
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

async function whichCmd() {
  for (const c of ["docker", "podman"]) {
    try {
      await execFileP(c, ["--version"], { timeout: 6000 });
      return c;
    } catch { /* essaie le suivant */ }
  }
  return null;
}

async function run(cmd, args) {
  const { stdout } = await execFileP(cmd, args, { timeout: 15000, maxBuffer: 4 * 1024 * 1024 });
  return stdout;
}

export async function getContainers() {
  const cmd = await whichCmd();
  if (!cmd) return { available: false, runtime: null, containers: [] };

  const header = await run(cmd, ["ps", "--format", "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.RunningFor}}", "-a"]);
  const lines = header.split("\n").filter((l) => l.trim());
  // Prend la première ligne (titre) comme référence de colonnes.
  const cols = lines[0]?.split(/\s+/).map((c) => c.toLowerCase()) || [];
  const containers = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(/\s{2,}|\s+/);
    if (parts.length < 3) continue;
    const [id, name, image, ...rest] = parts;
    const statusLine = rest.join(" ");
    const running = /Up/i.test(statusLine) || /running/i.test(statusLine);
    containers.push({
      id: id.slice(0, 12),
      name,
      image,
      status: running ? "running" : "exited",
      state: statusLine,
      cpuPct: 0,
      memBytes: 0,
    });
  }
  return { available: true, runtime: cmd, containers };
}

export async function containerAction(action, name) {
  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) throw new Error("Nom de conteneur invalide.");
  const cmd = await whichCmd();
  if (!cmd) throw new Error("Aucun moteur de conteneurs (Docker/Podman) disponible.");
  const map = { start: ["start", name], stop: ["stop", name], restart: ["restart", name], remove: ["rm", "-f", name] };
  if (!map[action]) throw new Error(`Action inconnue : ${action}`);
  const { stdout } = await execFileP(cmd, map[action], { timeout: 60000 });
  return { ok: true, output: stdout.trim() };
}

export async function listImages() {
  const cmd = await whichCmd();
  if (!cmd) return { available: false, images: [] };
  const out = await run(cmd, ["images", "--format", "{{.Repository}}:{{.Tag}}\t{{.Size}}"]);
  const images = out.split("\n").filter((l) => l.trim()).map((l) => {
    const [ref, size] = l.split("\t");
    return { ref, size };
  });
  return { available: true, images };
}
