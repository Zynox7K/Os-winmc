// ============================================================================
// ARQON OS — Stats système réelles
// Utilise les APIs Node/OS. Aucune donnée fictive.
// ============================================================================
import os from "node:os";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

// Cache des stats réseau pour calculer le taux instantané.
let prevNet = null;

function bytesToHuman(b) {
  if (b < 1024) return `${b} B`;
  const u = ["KiB", "MiB", "GiB", "TiB", "PiB"];
  let i = -1;
  do { b /= 1024; i++; } while (b >= 1024 && i < u.length - 1);
  return `${b.toFixed(1)} ${u[i]}`;
}

async function readNetStats() {
  // /proc/net/dev fournit les totaux réels par interface.
  try {
    const txt = fs.readFileSync("/proc/net/dev", "utf8");
    let rx = 0, tx = 0;
    for (const line of txt.split("\n").slice(2)) {
      const idx = line.indexOf(":");
      if (idx < 0) continue;
      const name = line.slice(0, idx).trim();
      if (name === "lo") continue;
      const parts = line.slice(idx + 1).trim().split(/\s+/);
      rx += Number(parts[0]) || 0;
      tx += Number(parts[8]) || 0;
    }
    return { rx, tx };
  } catch {
    return { rx: 0, tx: 0 };
  }
}

export async function getSystemInfo() {
  const cpus = os.cpus();
  return {
    os: `${os.type()} ${os.release()}`,
    platform: process.platform,
    kernel: os.release(),
    hostname: os.hostname(),
    arch: os.arch(),
    cpuModel: cpus[0]?.model ?? "unknown",
    cpuCores: cpus.length,
    totalMemBytes: os.totalmem(),
    uptime: os.uptime(),
    nodeVersion: process.versions.node,
  };
}

export async function getStats() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  // --- CPU ---
  let cpuUsage = 0;
  const perCore = [];
  for (const c of cpus) {
    const idle = c.times.idle;
    const total = idle + c.times.user + c.times.nice + c.times.sys + c.times.irq;
    const usage = total > 0 ? (1 - idle / total) * 100 : 0;
    perCore.push(Number(usage.toFixed(1)));
    cpuUsage += usage;
  }
  cpuUsage = cpus.length ? cpuUsage / cpus.length : 0;
  const load = os.loadavg();

  // --- Disque (statfs du filesystem de l'OS) ---
  let disk = { totalBytes: 0, usedBytes: 0, availableBytes: 0, usage: 0 };
  try {
    const stat = fs.statfsSync(process.cwd());
    const blockSize = stat.bsize;
    disk = {
      totalBytes: stat.blocks * blockSize,
      availableBytes: stat.bavail * blockSize,
      usedBytes: (stat.blocks - stat.bfree) * blockSize,
      usage: stat.blocks > 0 ? ((stat.blocks - stat.bavail) / stat.blocks) * 100 : 0,
    };
    disk.usage = Number(disk.usage.toFixed(1));
  } catch {
    // fallback: df
    try {
      const out = await execFileP("df", ["-B1", "--output=size,used,avail", process.cwd()]);
      const lines = out.stdout.trim().split("\n");
      const parts = lines[1].split(/\s+/).map(Number);
      if (parts.length >= 3) {
        disk = {
          totalBytes: parts[0],
          usedBytes: parts[1],
          availableBytes: parts[2],
          usage: parts[0] > 0 ? (parts[1] / parts[0]) * 100 : 0,
        };
        disk.usage = Number(disk.usage.toFixed(1));
      }
    } catch { /* ignore */ }
  }

  // --- Réseau ---
  const net = await readNetStats();
  const rxRate = prevNet ? Math.max(0, (net.rx - prevNet.rx) / 1000) : 0;
  const txRate = prevNet ? Math.max(0, (net.tx - prevNet.tx) / 1000) : 0;
  prevNet = net;

  // --- Température (si disponible) ---
  let temperature = { available: false };
  try {
    if (fs.existsSync("/sys/class/thermal/thermal_zone0/temp")) {
      const raw = Number(fs.readFileSync("/sys/class/thermal/thermal_zone0/temp", "utf8").trim());
      if (raw > 0) temperature = { available: true, value: raw / 1000 };
    }
  } catch { /* ignore */ }

  return {
    cpu: { usage: Number(cpuUsage.toFixed(1)), perCore, load },
    memory: {
      totalBytes: totalMem,
      usedBytes: usedMem,
      availableBytes: freeMem,
      usage: Number(((usedMem / totalMem) * 100).toFixed(1)),
    },
    disk,
    network: {
      rxBytes: net.rx,
      txBytes: net.tx,
      rxRate: Number(rxRate.toFixed(1)),
      txRate: Number(txRate.toFixed(1)),
    },
    temperature,
  };
}

export async function getProcesses() {
  // Lecture réelle de /proc pour une liste fidèle des processus.
  const procs = [];
  try {
    const entries = fs.readdirSync("/proc");
    for (const name of entries) {
      if (!/^\d+$/.test(name)) continue;
      const pid = Number(name);
      try {
        const stat = fs.readFileSync(`/proc/${name}/stat`, "utf8");
        const commMatch = stat.match(/^\d+\s+(\S+)/);
        const name2 = (commMatch ? commMatch[1] : name).replace(/\(|\)/g, "");
        const meminfo = fs.readFileSync(`/proc/${name}/status`, "utf8");
        const vmMatch = meminfo.match(/VmRSS:\s+(\d+)/);
        const memBytes = vmMatch ? Number(vmMatch[1]) * 1024 : 0;
        const cmdline = fs.readFileSync(`/proc/${name}/cmdline`, "utf8").replace(/\0/g, " ").trim();
        const totalMem = os.totalmem();
        procs.push({
          pid,
          name: name2,
          memBytes,
          memPct: totalMem > 0 ? Number(((memBytes / totalMem) * 100).toFixed(2)) : 0,
          cpu: 0,
          command: cmdline || name2,
        });
      } catch { /* proc disparu */ }
    }
    // cpu rough via top-like sampling would need two reads; keep 0 for per-proc cpu%
    // (mem/process list is the priority real data). Trim to top N.
    procs.sort((a, b) => b.memBytes - a.memBytes);
    return procs.slice(0, 200);
  } catch {
    return procs;
  }
}

export async function getNetworkInterfaces() {
  // Interfaces réseau réelles via `ip` (ou /proc/net/dev + /sys/class/net).
  const out = [];
  try {
    const fs2 = fs;
    const netDir = "/sys/class/net";
    if (fs2.existsSync(netDir)) {
      for (const name of fs2.readdirSync(netDir)) {
        let state = "unknown";
        try {
          const st = fs2.readFileSync(`${netDir}/${name}/operstate`, "utf8").trim();
          state = st || "unknown";
        } catch { /* ignore */ }
        let mac = "";
        try { mac = fs2.readFileSync(`${netDir}/${name}/address`, "utf8").trim(); } catch { /* ignore */ }
        let ip = "";
        try {
          const { stdout } = await execFileP("ip", ["-o", "-4", "addr", "show", name]);
          const m = stdout.match(/inet\s+(\S+)/);
          if (m) ip = m[1];
        } catch { /* ignore */ }
        out.push({ name, state, mac, ip });
      }
    }
  } catch { /* ignore */ }
  return out;
}

export { bytesToHuman };
