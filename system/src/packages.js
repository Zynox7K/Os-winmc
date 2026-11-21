// ============================================================================
// ARQON OS — Gestion des paquets réels
// Interroge les gestionnaires réels : dpkg (APT), flatpak, pip, npm global.
// ============================================================================
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

async function run(cmd, args) {
  try {
    const { stdout } = await execFileP(cmd, args, { maxBuffer: 4 * 1024 * 1024, timeout: 15000 });
    return stdout;
  } catch {
    return "";
  }
}

export async function getInstalledPackages() {
  const out = [];

  // --- APT / dpkg ---
  const dpkg = await run("dpkg-query", ["-W", "-f=${Package}\t${Version}\t${Binary:Summary}\n"]);
  for (const line of dpkg.split("\n")) {
    const parts = line.split("\t");
    if (parts.length >= 2) {
      out.push({
        name: parts[0],
        version: parts[1],
        source: "apt",
        description: parts[2] || undefined,
      });
    }
  }

  // --- Flatpak ---
  const flatpak = await run("flatpak", ["list", "--columns=name,version,app", "--format=%{name}\t%{version}\t%{app}"])
    || await run("flatpak", ["list", "--columns=name,version", "--format=%{name}\t%{version}"]);
  for (const line of flatpak.split("\n")) {
    const parts = line.split("\t");
    if (parts[0]) {
      out.push({ name: parts[0], version: parts[1] || "", source: "flatpak" });
    }
  }

  // --- pip (global) ---
  const pip = await run("pip3", ["list", "--format=freeze"]);
  for (const line of pip.split("\n")) {
    const m = line.match(/^([^=@\s]+)==?([^\s]*)$/);
    if (m) out.push({ name: m[1], version: m[2], source: "pip" });
  }

  // --- npm global ---
  const npm = await run("npm", ["ls", "-g", "--depth=0", "--parseable", "--long"]);
  for (const line of npm.split("\n")) {
    const parts = line.split("\t");
    if (parts[0]) out.push({ name: parts[0].split("/").pop(), version: parts[1] || "", source: "npm" });
  }

  // Tri et déduplication par (name, source).
  const seen = new Set();
  const filtered = out.filter((p) => {
    const k = `${p.source}:${p.name}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return filtered;
}

export async function getUpdateCount() {
  const out = await run("apt-get", ["-s", "upgrade"]);
  const m = out.match(/(\d+)\s+upgraded/);
  return { available: m ? Number(m[1]) : 0 };
}

// Installation via le gestionnaire réel (avec confirmation côté UI).
export async function installPackage(name, source = "apt") {
  if (!name || /[;&|`$]/.test(name)) throw new Error("Nom de paquet invalide.");
  if (source === "apt") {
    const { stdout } = await execFileP("bash", ["-lc", `apt-get install -y ${name}`], { timeout: 600000 });
    return { ok: true, output: stdout };
  }
  if (source === "pip") {
    const { stdout } = await execFileP("bash", ["-lc", `pip3 install ${name}`], { timeout: 600000 });
    return { ok: true, output: stdout };
  }
  throw new Error("Source non supportée.");
}
