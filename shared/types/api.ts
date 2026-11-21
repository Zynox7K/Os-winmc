// ============================================================================
// ARQON OS — Types d'API système (contrat frontend/backend)
// ============================================================================

export interface SystemInfo {
  os: string;
  platform: string;
  kernel: string;
  hostname: string;
  arch: string;
  cpuModel: string;
  cpuCores: number;
  totalMemBytes: number;
  uptime: number;
  nodeVersion: string;
}

export interface SystemStats {
  cpu: {
    usage: number;            // 0..100
    perCore: number[];        // usage par cœur
    load: number[];           // load average (1/5/15 min)
  };
  memory: {
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
    usage: number;            // 0..100
  };
  disk: {
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
    usage: number;            // 0..100
  };
  network: {
    rxBytes: number;         // total received
    txBytes: number;         // total transmitted
    rxRate: number;          // bytes/s instantané
    txRate: number;          // bytes/s instantané
  };
  temperature?: { available: boolean; value?: number };
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;               // %
  memBytes: number;
  memPct: number;            // %
  command: string;
}

export interface TerminalInitMessage {
  type: "init";
  cols: number;
  rows: number;
  shell?: string;
  cwd?: string;
}

export interface TerminalResizeMessage {
  type: "resize";
  cols: number;
  rows: number;
}

export interface TerminalDataMessage {
  type: "data";
  data: string;
}

export interface TerminalExitMessage {
  type: "exit";
  code: number;
}

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  sizeBytes: number;
  modifiedMs: number;
}

export interface ProjectInfo {
  path: string;
  name: string;
  language: string;          // "TypeScript", "Python", ...
  detectedBy: string;        // fichier de détection
  packageManager?: string;   // "npm", "cargo", "pip", ...
  isGitRepo: boolean;
  hasNodeModules: boolean;
}

export interface PackageEntry {
  name: string;
  version: string;
  source: "apt" | "flatpak" | "pip" | "npm" | "system";
  description?: string;
}

export interface GitStatus {
  path: string;
  isRepo: boolean;
  branch: string;
  ahead: number;
  behind: number;
  clean: boolean;
  changes: GitChange[];
  remotes: string[];
}

export interface GitChange {
  status: "modified" | "added" | "deleted" | "untracked" | "renamed" | "conflicted";
  file: string;
}

export interface DevToolInfo {
  id: string;
  name: string;
  category: string;
  installed: boolean;
  version?: string;
  path?: string;
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: "running" | "stopped" | "exited" | "unknown";
  state: string;
  cpuPct: number;
  memBytes: number;
}

export interface ApiError {
  error: string;
  detail?: string;
}
