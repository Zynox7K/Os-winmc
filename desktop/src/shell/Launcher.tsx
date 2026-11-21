// ============================================================================
// ARQON OS — Launcher (recherche universelle)
// Recherche : applications, fichiers, projets, commandes, paramètres, outils.
// Utilise le backend réel pour les fichiers et projets.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { Search, Terminal, Code2, FolderGit2, Package, Boxes, Activity, GitBranch, Settings, FileText, Cpu } from "lucide-react";
import { api } from "../api/client.js";
import type { AppId } from "../App.js";
import type { FileEntry, ProjectInfo, DevToolInfo } from "../../../shared/types/api";

interface Props {
  onClose: () => void;
  onOpen: (id: AppId) => void;
}

interface Result {
  kind: "app" | "file" | "project" | "tool" | "system";
  label: string;
  sub?: string;
  icon: React.ReactNode;
  action: () => void;
}

const APP_ENTRIES: { id: AppId; label: string; icon: React.ReactNode }[] = [
  { id: "terminal", label: "Terminal", icon: <Terminal size={16} /> },
  { id: "code", label: "ARQON Code", icon: <Code2 size={16} /> },
  { id: "projects", label: "Projets", icon: <FolderGit2 size={16} /> },
  { id: "packages", label: "Paquets", icon: <Package size={16} /> },
  { id: "devtools", label: "DevTools", icon: <Boxes size={16} /> },
  { id: "containers", label: "Conteneurs", icon: <Activity size={16} /> },
  { id: "monitor", label: "Monitor", icon: <Activity size={16} /> },
  { id: "git", label: "Git", icon: <GitBranch size={16} /> },
  { id: "settings", label: "Paramètres", icon: <Settings size={16} /> },
];

export default function Launcher({ onClose, onOpen }: Props) {
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [tools, setTools] = useState<DevToolInfo[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // ESC ferme le launcher
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Chargement async des données réelles (debounce léger).
  useEffect(() => {
    let active = true;
    const q = query.trim().toLowerCase();
    const t = setTimeout(() => {
      if (!q) { setFiles([]); setProjects([]); return; }
      api.roots().then((r) => {
        // Cherche dans les racines pour les fichiers/projets.
        Promise.all([api.projects(), api.devtools()])
          .then(([pr, dt]) => { if (active) { setProjects(pr); setTools(dt); } })
          .catch(() => {});
        // Recherche de fichiers sur la racine home.
        api.listDir(r.roots[0] || ".").then((f) => {
          if (active) setFiles(f.filter((x) => x.name.toLowerCase().includes(q)));
        }).catch(() => {});
      }).catch(() => {});
    }, 120);
    return () => { active = false; clearTimeout(t); };
  }, [query]);

  const results: Result[] = [];

  for (const a of APP_ENTRIES) {
    if (query.toLowerCase().split(" ").every((w) => a.label.toLowerCase().includes(w))) {
      results.push({ kind: "app", label: a.label, sub: "Application", icon: a.icon, action: () => onOpen(a.id) });
    }
  }

  if (query.toLowerCase().includes("commande") || query.toLowerCase().includes("terminal")) {
    results.push({ kind: "system", label: "Ouvrir le Terminal", sub: "Commande", icon: <Terminal size={16} />, action: () => onOpen("terminal") });
  }

  for (const p of projects) {
    if (p.name.toLowerCase().includes(query.toLowerCase()) || p.language.toLowerCase().includes(query.toLowerCase())) {
      results.push({ kind: "project", label: p.name, sub: `${p.language} · ${p.path}`, icon: <FolderGit2 size={16} />, action: () => onOpen("projects") });
    }
  }

  for (const f of files) {
    results.push({ kind: "file", label: f.name, sub: f.path, icon: <FileText size={16} />, action: () => onOpen("code") });
  }

  for (const t of tools) {
    if (t.name.toLowerCase().includes(query.toLowerCase())) {
      results.push({ kind: "tool", label: t.name, sub: t.installed ? `Installé · ${t.version}` : "Non installé", icon: <Cpu size={16} />, action: () => onOpen("devtools") });
    }
  }

  results.sort((a, b) => (a.kind === "app" ? 0 : 1) - (b.kind === "app" ? 0 : 1));

  return (
    <div className="aq-launcher-overlay" onClick={onClose}>
      <div className="aq-launcher aq-glass" onClick={(e) => e.stopPropagation()}>
        <div className="aq-launcher-input-wrap">
          <Search size={20} />
          <input
            ref={inputRef}
            className="aq-launcher-input"
            placeholder="Rechercher applications, fichiers, projets, commandes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="aq-launcher-results">
          {results.length === 0 && (
            <div className="aq-launcher-empty aq-muted">
              {query ? `Aucun résultat pour « ${query} ».` : "Commencez à taper pour rechercher."}
            </div>
          )}
          {results.slice(0, 30).map((r, i) => (
            <button key={i} className="aq-launcher-result" onClick={() => { r.action(); onClose(); }}>
              <span className="aq-launcher-icon">{r.icon}</span>
              <span className="aq-launcher-text">
                <span className="aq-launcher-label">{r.label}</span>
                {r.sub && <span className="aq-launcher-sub">{r.sub}</span>}
              </span>
              <span className="aq-launcher-kind">{r.kind}</span>
            </button>
          ))}
        </div>
      </div>
      <style>{`
        .aq-launcher-overlay {
          position: fixed; inset: 0; z-index: 8500;
          background: rgba(5, 8, 14, 0.55);
          backdrop-filter: blur(6px);
          display: flex; align-items: flex-start; justify-content: center;
          padding-top: 12vh;
          animation: aq-fade-in var(--aq-dur) var(--aq-ease-out);
        }
        .aq-launcher {
          width: min(560px, 92vw);
          border-radius: var(--aq-radius-lg);
          box-shadow: var(--aq-shadow-lg);
          overflow: hidden;
        }
        .aq-launcher-input-wrap {
          display: flex; align-items: center; gap: 12px;
          padding: 18px 20px;
          border-bottom: var(--aq-glass-border);
          color: var(--aq-text-dim);
        }
        .aq-launcher-input {
          flex: 1; border: none; background: none; outline: none;
          font-size: 17px; color: var(--aq-text);
        }
        .aq-launcher-input::placeholder { color: var(--aq-muted); }
        .aq-launcher-results { max-height: 46vh; overflow-y: auto; padding: 8px; }
        .aq-launcher-empty { padding: 30px; text-align: center; }
        .aq-launcher-result {
          display: flex; align-items: center; gap: 14px;
          width: 100%; padding: 10px 14px; border-radius: var(--aq-radius);
          text-align: left;
          transition: background var(--aq-dur-fast) var(--aq-ease);
        }
        .aq-launcher-result:hover { background: var(--aq-surface-hover); }
        .aq-launcher-icon {
          width: 34px; height: 34px; border-radius: 9px;
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--aq-surface); color: var(--aq-accent);
          flex-shrink: 0;
        }
        .aq-launcher-text { flex: 1; display: flex; flex-direction: column; }
        .aq-launcher-label { font-weight: 600; font-size: 14px; }
        .aq-launcher-sub { font-size: 11.5px; color: var(--aq-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .aq-launcher-kind { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--aq-muted); }
      `}</style>
    </div>
  );
}
