// ============================================================================
// ARQON OS — Client API système
// Appelle le backend réel (via le proxy Vite /api). Aucune donnée fictive.
// ============================================================================
import type {
  SystemInfo,
  SystemStats,
  ProcessInfo,
  FileEntry,
  ProjectInfo,
  PackageEntry,
  GitStatus,
  DevToolInfo,
  ContainerInfo,
} from "../../../shared/types/api";

const BASE = "/api";

async function get<T>(url: string): Promise<T> {
  const r = await fetch(BASE + url);
  if (!r.ok) {
    const e = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error(e.error || `HTTP ${r.status}`);
  }
  return r.json() as Promise<T>;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(BASE + url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error(e.error || `HTTP ${r.status}`);
  }
  return r.json() as Promise<T>;
}

export const api = {
  info: () => get<SystemInfo>("/system/info"),
  stats: () => get<SystemStats>("/system/stats"),
  processes: () => get<ProcessInfo[]>("/system/processes"),
  network: () => get<{ name: string; state: string; mac: string; ip: string }[]>("/system/network"),
  roots: () => get<{ roots: string[] }>("/system/roots"),

  listDir: (path: string) => get<FileEntry[]>(`/files/list?path=${encodeURIComponent(path)}`),
  readFile: (path: string) => get<{ path: string; content: string }>(`/files?path=${encodeURIComponent(path)}`),
  writeFile: (path: string, content: string) => post<{ path: string; bytes: number }>("/files", { path, content }),
  mkdir: (path: string) => post<{ path: string }>("/files/mkdir", { path }),
  deletePath: (path: string) => post<{ path: string }>("/files/delete", { path }),

  projects: (root?: string) => get<ProjectInfo[]>(`/projects${root ? `?root=${encodeURIComponent(root)}` : ""}`),
  projectAt: (path: string) => get<ProjectInfo>(`/projects/at?path=${encodeURIComponent(path)}`),

  packages: () => get<PackageEntry[]>("/packages"),
  updates: () => get<{ available: number }>("/packages/updates"),
  installPackage: (name: string, source: string) => post<{ ok: boolean; output: string }>("/packages/install", { name, source }),

  gitStatus: (path: string) => get<GitStatus>(`/git/status?path=${encodeURIComponent(path)}`),
  gitRepos: () => get<{ path: string; name: string; branch: string }[]>("/git/repos"),
  gitExec: (path: string, args: string[]) => post<{ stdout: string; stderr: string }>("/git/exec", { path, args }),

  devtools: () => get<DevToolInfo[]>("/devtools"),

  containers: () => get<{ available: boolean; runtime: string | null; containers: ContainerInfo[] }>("/containers"),
  containerImages: () => get<{ available: boolean; images: { ref: string; size: string }[] }>("/containers/images"),
  containerAction: (action: string, name: string) =>
    post<{ ok: boolean; output: string }>("/containers/action", { action, name }),
};

// ---------------------------------------------------------------------------
// WebSocket PTY terminal
// ---------------------------------------------------------------------------
export class TerminalSocket {
  private ws: WebSocket | null = null;
  onData: (data: string) => void = () => {};
  onExit: (code: number) => void = () => {};
  onError: (msg: string) => void = () => {};

  connect(cols: number, rows: number, shell?: string, cwd?: string) {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    this.ws = new WebSocket(`${proto}://${location.host}/ws/terminal`);
    this.ws.onopen = () => {
      this.ws!.send(JSON.stringify({ type: "init", cols, rows, shell, cwd }));
    };
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "data") this.onData(msg.data);
      else if (msg.type === "exit") this.onExit(msg.code);
      else if (msg.type === "error") this.onError(msg.message);
    };
    this.ws.onclose = () => this.onExit(-1);
    return this;
  }

  send(data: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: "data", data }));
  }

  resize(cols: number, rows: number) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN)
      this.ws.send(JSON.stringify({ type: "resize", cols, rows }));
  }

  signal(sig: "int" | "term") {
    if (this.ws && this.ws.readyState === WebSocket.OPEN)
      this.ws.send(JSON.stringify({ type: "signal", sig }));
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}

// ---------------------------------------------------------------------------
// Formatage
// ---------------------------------------------------------------------------
export function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  const u = ["KiB", "MiB", "GiB", "TiB", "PiB"];
  let i = -1;
  do { b /= 1024; i++; } while (b >= 1024 && i < u.length - 1);
  return `${b.toFixed(b < 10 ? 2 : 1)} ${u[i]}`;
}

export function fmtUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}j ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
