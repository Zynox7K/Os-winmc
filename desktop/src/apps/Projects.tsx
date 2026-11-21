// ============================================================================
// ARQON OS — ARQON Projects (gestionnaire centralisé de projets)
// Détection réelle des projets, langages, dépendances, statut Git.
// ============================================================================
import { useEffect, useState } from "react";
import { FolderPlus, FolderGit2, GitBranch, ArrowUpRight, RefreshCw, Package } from "lucide-react";
import { api } from "../api/client.js";
import type { ProjectInfo, GitStatus } from "../../../shared/types/api";

export default function ProjectsApp({ onNotify }: { winId?: string; onNotify?: (t: string, b: string) => void; onOpenCode?: () => void }) {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProjectInfo | null>(null);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);

  const load = () => {
    setLoading(true);
    api.projects().then((p) => { setProjects(p); setLoading(false); }).catch((e) => { setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const openProject = (p: ProjectInfo) => {
    setSelected(p);
    api.gitStatus(p.path).then(setGitStatus).catch(() => {});
    onNotify?.("ARQON Projects", `Projet « ${p.name} » ouvert — ${p.language}`);
  };

  const langColor: Record<string, string> = {
    "TypeScript": "var(--aq-accent)", "Node.js / JavaScript": "var(--aq-warning)",
    "Python": "var(--aq-success)", "Rust": "#f05d6c", "Go": "var(--aq-accent-2)",
    "Java (Maven)": "#f05d6c", "C / C++": "var(--aq-accent-2)", "Ruby": "var(--aq-error)",
  };

  return (
    <div className="aq-projects">
      <div className="aq-projects-list aq-glass">
        <div className="aq-panel-head">
          <span>Projets</span>
          <button className="aq-iconbtn" onClick={load} title="Actualiser"><RefreshCw size={14} /></button>
        </div>
        <div className="aq-panel-search">
          <input className="aq-input" placeholder="Rechercher un projet…" />
        </div>
        <div className="aq-projects-items aq-scroll">
          {loading && <div className="aq-empty">Chargement des projets…</div>}
          {!loading && projects.length === 0 && <div className="aq-empty">Aucun projet détecté dans l'espace ARQON.</div>}
          {projects.map((p) => (
            <button key={p.path} className={`aq-project ${selected?.path === p.path ? "active" : ""}`} onClick={() => openProject(p)}>
              <div className="aq-project-icon"><FolderGit2 size={18} /></div>
              <div className="aq-project-info">
                <div className="aq-project-name">{p.name}</div>
                <div className="aq-project-meta">
                  <span className="aq-lang-dot" style={{ background: langColor[p.language] || "var(--aq-muted)" }} />
                  {p.language}
                  {p.packageManager && <span className="aq-badge">{p.packageManager}</span>}
                  {p.isGitRepo && <GitBranch size={11} />}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="aq-projects-detail aq-glass">
        {!selected ? (
          <div className="aq-empty-detail">
            <FolderPlus size={48} />
            <p>Sélectionnez un projet pour voir ses détails, ses dépendances et son statut Git.</p>
          </div>
        ) : (
          <div className="aq-detail">
            <div className="aq-detail-head">
              <div>
                <h2>{selected.name}</h2>
                <div className="aq-detail-path aq-mono aq-muted">{selected.path}</div>
              </div>
              <button className="aq-btn aq-btn-primary" onClick={() => onNotify?.("ARQON Code", `Ouverture de « ${selected.name} » dans ARQON Code.`)}>
                <ArrowUpRight size={15} /> Ouvrir dans ARQON Code
              </button>
            </div>

            <div className="aq-detail-grid">
              <Stat label="Langage" value={selected.language} />
              <Stat label="Détection" value={selected.detectedBy} />
              <Stat label="Gestionnaire" value={selected.packageManager || "—"} />
              <Stat label="Dépôt Git" value={selected.isGitRepo ? "Oui" : "Non"} />
              <Stat label="Dépendances" value={selected.hasNodeModules ? "Installées" : "—"} />
            </div>

            {gitStatus && (
              <div className="aq-detail-git">
                <h3>Statut Git</h3>
                <div className="aq-git-summary">
                  <span className={`aq-badge ${gitStatus.clean ? "aq-badge-success" : "aq-badge-warning"}`}>
                    {gitStatus.clean ? "Propre" : `${gitStatus.changes.length} modification(s)`}
                  </span>
                  <span className="aq-badge">{gitStatus.branch}</span>
                  {gitStatus.ahead > 0 && <span className="aq-badge aq-badge-accent">{gitStatus.ahead} à pousser</span>}
                  {gitStatus.behind > 0 && <span className="aq-badge aq-badge-warning">{gitStatus.behind} en retard</span>}
                </div>
                <div className="aq-git-changes">
                  {gitStatus.changes.map((c, i) => (
                    <div key={i} className="aq-git-change">
                      <span className={`aq-gc-status aq-gc-${c.status}`}>{c.status[0].toUpperCase()}</span>
                      <span className="aq-mono aq-truncate">{c.file}</span>
                    </div>
                  ))}
                  {gitStatus.changes.length === 0 && <div className="aq-muted">Aucune modification en attente.</div>}
                </div>
              </div>
            )}

            <div className="aq-detail-deps">
              <h3>Dépendances</h3>
              <div className="aq-deps">
                <span className="aq-badge"><Package size={11} /> {selected.packageManager || "gestionnaire détecté"}</span>
                {selected.packageManager === "npm" && <span className="aq-badge">node_modules</span>}
                <span className="aq-badge">{selected.language}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .aq-projects { display: flex; height: 100%; background: var(--aq-bg); }
        .aq-projects-list { width: 280px; display: flex; flex-direction: column; border-right: var(--aq-glass-border); }
        .aq-panel-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; font-weight: 700; font-size: 14px; }
        .aq-iconbtn { padding: 5px; border-radius: var(--aq-radius-sm); color: var(--aq-muted); }
        .aq-iconbtn:hover { background: var(--aq-surface-hover); color: var(--aq-text); }
        .aq-panel-search { padding: 0 14px 10px; }
        .aq-projects-items { flex: 1; padding: 0 8px 10px; }
        .aq-project {
          display: flex; align-items: center; gap: 12px; width: 100%;
          padding: 10px 10px; border-radius: var(--aq-radius); text-align: left;
          transition: background var(--aq-dur-fast) var(--aq-ease);
        }
        .aq-project:hover { background: var(--aq-surface-hover); }
        .aq-project.active { background: var(--aq-accent-soft); }
        .aq-project-icon { width: 36px; height: 36px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; background: var(--aq-surface); color: var(--aq-accent); flex-shrink: 0; }
        .aq-project-info { flex: 1; min-width: 0; }
        .aq-project-name { font-weight: 600; font-size: 13.5px; }
        .aq-project-meta { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--aq-muted); margin-top: 2px; }
        .aq-lang-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
        .aq-projects-detail { flex: 1; overflow-y: auto; }
        .aq-empty { padding: 20px; text-align: center; color: var(--aq-muted); font-size: 13px; }
        .aq-empty-detail { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: var(--aq-muted); text-align: center; padding: 30px; }
        .aq-detail { padding: 22px; }
        .aq-detail-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .aq-detail-head h2 { font-size: 20px; }
        .aq-detail-path { font-size: 12px; margin-top: 4px; }
        .aq-detail-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 20px 0; }
        .aq-detail-git, .aq-detail-deps { margin-top: 22px; }
        .aq-detail-git h3, .aq-detail-deps h3 { font-size: 14px; margin-bottom: 12px; }
        .aq-git-summary { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
        .aq-git-changes { display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto; }
        .aq-git-change { display: flex; align-items: center; gap: 10px; padding: 6px 10px; background: var(--aq-surface); border-radius: var(--aq-radius-sm); font-size: 12.5px; }
        .aq-gc-status { width: 22px; height: 22px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; }
        .aq-gc-modified { background: var(--aq-warning-soft); color: var(--aq-warning); }
        .aq-gc-added { background: var(--aq-success-soft); color: var(--aq-success); }
        .aq-gc-deleted { background: var(--aq-error-soft); color: var(--aq-error); }
        .aq-gc-untracked { background: var(--aq-accent-soft); color: var(--aq-accent); }
        .aq-deps { display: flex; gap: 8px; flex-wrap: wrap; }
        @media (max-width: 700px) { .aq-detail-grid { grid-template-columns: 1fr 1fr; } }
      `}</style>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="aq-stat">
      <div className="aq-stat-label aq-muted">{label}</div>
      <div className="aq-stat-val">{value}</div>
      <style>{`.aq-stat { background: var(--aq-surface); border: var(--aq-border); border-radius: var(--aq-radius); padding: 12px; } .aq-stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; } .aq-stat-val { font-size: 15px; font-weight: 700; margin-top: 4px; }`}</style>
    </div>
  );
}
