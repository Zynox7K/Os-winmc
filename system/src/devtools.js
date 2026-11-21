// ============================================================================
// ARQON OS — Détection réelle des outils de développement
// Interroge les binaire du système pour savoir ce qui est installé + version.
// ============================================================================
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

async function probe(cmd, args = ["--version"]) {
  try {
    const { stdout, stderr } = await execFileP(cmd, args, { timeout: 8000, maxBuffer: 2048 * 1024 });
    const v = (stdout || stderr).split("\n")[0].trim();
    return { installed: true, version: v, path: null };
  } catch {
    return { installed: false };
  }
}

async function which(cmd) {
  try {
    const { stdout } = await execFileP("bash", ["-lc", `command -v ${cmd}`], { timeout: 8000 });
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

const TOOLS = [
  { id: "node", name: "Node.js", category: "JavaScript", cmd: "node" },
  { id: "npm", name: "npm", category: "JavaScript", cmd: "npm" },
  { id: "bun", name: "Bun", category: "JavaScript", cmd: "bun" },
  { id: "pnpm", name: "pnpm", category: "JavaScript", cmd: "pnpm" },
  { id: "yarn", name: "Yarn", category: "JavaScript", cmd: "yarn" },
  { id: "python", name: "Python", category: "Python", cmd: "python3", args: ["--version"] },
  { id: "pip", name: "pip", category: "Python", cmd: "pip3" },
  { id: "rust", name: "Rust", category: "Rust", cmd: "rustc" },
  { id: "cargo", name: "Cargo", category: "Rust", cmd: "cargo" },
  { id: "go", name: "Go", category: "Go", cmd: "go", args: ["version"] },
  { id: "java", name: "Java", category: "Java", cmd: "java", args: ["-version"] },
  { id: "maven", name: "Maven", category: "Java", cmd: "mvn" },
  { id: "gradle", name: "Gradle", category: "Java", cmd: "gradle" },
  { id: "gcc", name: "GCC", category: "C/C++", cmd: "gcc", args: ["--version"] },
  { id: "g++", name: "G++", category: "C/C++", cmd: "g++", args: ["--version"] },
  { id: "cmake", name: "CMake", category: "C/C++", cmd: "cmake", args: ["--version"] },
  { id: "make", name: "Make", category: "C/C++", cmd: "make", args: ["--version"] },
  { id: "php", name: "PHP", category: "PHP", cmd: "php", args: ["--version"] },
  { id: "ruby", name: "Ruby", category: "Ruby", cmd: "ruby", args: ["--version"] },
  { id: "docker", name: "Docker", category: "Containers", cmd: "docker", args: ["--version"] },
  { id: "podman", name: "Podman", category: "Containers", cmd: "podman", args: ["--version"] },
  { id: "git", name: "Git", category: "Version Control", cmd: "git", args: ["--version"] },
  { id: "ssh", name: "OpenSSH", category: "Network", cmd: "ssh", args: ["-V"] },
  { id: "tmux", name: "tmux", category: "Terminal", cmd: "tmux", args: ["-V"] },
];

export async function getDevTools() {
  const out = [];
  for (const t of TOOLS) {
    const res = await probe(t.cmd, t.args);
    out.push({
      id: t.id,
      name: t.name,
      category: t.category,
      installed: res.installed,
      version: res.version,
      path: await which(t.cmd),
    });
  }
  return out;
}
